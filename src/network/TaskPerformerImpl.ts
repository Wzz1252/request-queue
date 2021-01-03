import {RequestState} from "./enum/RequestState";
import Request from "./Request";
import RequestFailListener from "./RequestFailListener";
import RequestSuccessListener from "./RequestSuccessListener";
import Task from "./Task";
import RequestUtils from "./RequestUtils";
import RequestConfig from "./RequestConfig";
import {AxiosResponse} from "axios";
import ResponseDataEntity from "./entity/ResponseDataEntity";
import Logger from "./Logger";
import ResponseEntity from "./entity/ResponseEntity";
import {RequestMethod} from "./enum/MethodEnum";
import Header from "./entity/Header";
import DataParser from "./DataParser";
import RequestFrontListener from "./RequestFrontListener";

const TAG = "TaskPerformerImpl";

export default abstract class TaskPerformerImpl<T> implements Task<T> {
    private request!: Request<T>;
    private requestConfig!: RequestConfig;
    /**
     * 当前请求的状态，以后用于重置任务
     */
    private state: RequestState = RequestState.NONE;
    /**
     * 是否已经终止任务，如果终止，重试等任务将不再执行
     */
    private isAbort: boolean = false;
    /**
     * 当前重试次数
     */
    private currentRetry: number = 0;

    protected baseUrl!: string;
    protected timeout: number = 1000;
    protected globalHeaders?: Array<Header>;
    protected withCredentials!: boolean;
    protected auto?: Header;
    protected retry: number = 0;
    protected responseType!: RequestConfig;
    protected dataParses!: Array<DataParser<T>>;

    /** 请求的 url */
    protected url: string = "";
    /** 请求的数据 */
    protected data: any = {};
    /** 请求类型 */
    protected method: RequestMethod = RequestMethod.GET;
    /** 请求头 */
    protected headers: any = {};
    protected requestTask?: any;

    protected frontListener?: Promise<RequestFrontListener<T>>;

    public successListener?: Array<RequestSuccessListener<T>>;
    public failListener?: Array<RequestFailListener<T>>;
    public uploadProgressListener?: ((progressEvent: any) => void);
    public downloadProgressListener?: ((progressEvent: any) => void);

    public run(): void {
        this.requestVerification();
    }

    public initTask(request: Request<T>, requestConfig: RequestConfig): void {
        this.request = request;
        this.requestConfig = requestConfig;

        this.url = this.request.getUrl();
        if (RequestUtils.isEmpty(this.url)) {
            throw new Error("Request URL 不能为空");
        }
        this.data = this.disposeDataIsNull(this.request.getData());
        this.method = this.request.getMethod() || RequestMethod.GET;
        this.headers = this.parseHeaders(this.request.getHeaders());
        this.frontListener = this.request.getFrontListener();

        this.baseUrl = this.requestConfig.baseUrl;
        this.timeout = this.requestConfig.timeout;
        this.globalHeaders = this.requestConfig.getHeaders();
        this.disposeHeader(this.headers, this.globalHeaders);

        this.withCredentials = this.requestConfig.withCredentials;
        this.auto = this.requestConfig.auto;
        this.dataParses = this.requestConfig.dataParser;
        if (!this.dataParses || this.dataParses.length <= 0) {
            throw new Error("没有数据解析器");
        }
    }

    public addSuccessListener(listener: RequestSuccessListener<T>): void {
        if (!this.successListener) {
            this.successListener = new Array<RequestSuccessListener<T>>();
        }
        this.successListener.push(listener);
    }

    public addFailListener(listener: RequestFailListener<T>): void {
        if (!this.failListener) {
            this.failListener = new Array<RequestFailListener<T>>();
        }
        this.failListener.push(listener);
    }

    public getState(): RequestState {
        return this.state;
    }

    public setRequest(request: Request<T>): void {
        this.request = request;
    }

    public getRequest(): Request<T> {
        return this.request;
    }

    protected async requestVerification(): Promise<void> {
        Logger.log(TAG, "请求任务: ", this.request.getMethod(), this.request.getUrl());
        this.state = RequestState.RUNNING;
        this.requestTask = this.createRequest(this.url, this.method, this.data, this.headers,
            (result: any, error: any) => {
                // TODO 临时写法，有时间优化
                for (let i = 0; i < this.dataParses.length; i++) {
                    let dataParse = this.dataParses[i];
                    if (!dataParse.isParser(result)) {
                        break;
                    }
                    let isSuccess = false;
                    dataParse.dataParser(result, error,
                        (resultData) => {
                            this.callSuccessListener(resultData, result, this.request);
                            isSuccess = true;
                        },
                        (code, errorMessage, data) => {
                            this.handleFail(code, errorMessage, data);
                            isSuccess = true;
                        });
                    if (isSuccess) {
                        break;
                    }
                }
            });
    }

    /**
     * 需要使用者自己实现相关逻辑
     * 创建一个网络请求类库，类似 axios、wx.request 等
     * @param url       请求的 url
     * @param method    请求的方法
     * @param data      请求数据
     * @param headers   请求头
     * @param callback  回调事件
     * @protected
     */
    protected abstract createRequest<F>(url: string, method: RequestMethod, data: any, headers: any,
                                        callback: (request: any, error: any) => void): void;

    /**
     * 需要使用者自己实现相关逻辑
     * 终止网络请求
     * @protected
     */
    protected abstract runAbort(): void;

    public abort(): void {
        this.isAbort = true;
        this.runAbort();
    }

    /**
     * 处理请求数据中 null 的问题，如果传入的是一个null，就将他忽略
     */
    private disposeDataIsNull(data: any): Object {
        let newData = {} as any;
        let oldData = data || ({} as any);
        if (data instanceof Array) {
            newData = oldData;
        } else {
            for (let dataKey in oldData) {
                if (!oldData.hasOwnProperty(dataKey)) {
                    continue;
                }
                let dataValue = oldData[dataKey] /*|| null*/; // 如果是 null 或者 "" 统一不传
                if (dataValue != undefined) {
                    newData[dataKey] = dataValue;
                }
            }
        }
        return newData;
    }

    /**
     * 将数组形式的 Header 转换成 Json 对象的形式
     */
    private parseHeaders(headers: Array<Header>): Object {
        let header = {} as any;
        headers.forEach((value: any): void => {
            header[value.key] = value.value;
        });
        return header;
    }

    private callSuccessListener(data: T, result: AxiosResponse<ResponseDataEntity<T>>, request: Request<T>): void {
        this.state = RequestState.SUCCESS;
        Logger.log(TAG, "请求成功: ", request.getMethod(), request.getUrl());
        let response = new ResponseEntity<T>();
        response.headers = result.headers;
        response.request = request;
        if (!this.successListener) {
            return;
        }
        for (let i = 0; i < this.successListener.length; i++) {
            this.successListener[i](data, response);
        }
    }

    private callFailListener(code: string, message: string, data: any): void {
        this.state = RequestState.FAIL;
        let error = new ResponseDataEntity<T>();
        error.code = code;
        error.message = message;
        error.data = data;
        if (!this.failListener) {
            return;
        }
        for (let i = 0; i < this.failListener.length; i++) {
            this.failListener[i](error);
        }
    }

    private handleFail(code: string, message: string, data: any): void {
        if (this.isAbort) {
            this.callFailListener(code, message, data);
            return;
        }
        if (this.isRetry()) {
            this.currentRetry++;
            Logger.log(TAG, "任务失败，开始重试，重试次数：", this.currentRetry);
            this.run();
            return;
        }
        this.callFailListener(code, message, data);
    }

    private isRetry(): boolean {
        return this.retry !== this.currentRetry;
    }

    private disposeHeader(header: any, globalHeaders: Array<Header>): any {
        header = header || {};
        globalHeaders.forEach((value) => {
            header[value.key] = value.value;
        });
        return header;
    }
}