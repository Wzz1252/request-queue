import Task from "./Task";
import {RequestMethod} from "./enum/MethodEnum";
import Header from "./entity/Header";
import ResponseEntity from "./entity/ResponseEntity";
import ResponseDataEntity from "./entity/ResponseDataEntity";
import RequestConfig from "./RequestConfig";
import Logger from "./Logger";
import RequestSuccessListener from "./RequestSuccessListener";
import RequestFailListener from "./RequestFailListener";
import RequestFrontListener from "./RequestFrontListener";

const TAG = "Request";

export default class Request<T> {
    /** 请求地址，格式：/xxx/xxx/xxx */
    private url!: string;
    /**
     * 请求数据体
     * 格式为：
     * {
     *      username: xxx,
     *      object: {
     *          username: xxx
     *      }
     * }
     */
    private data: any = {};
    /** 请求类型 */
    private method: RequestMethod = RequestMethod.GET;
    /** 请求头 */
    private headers: Array<Header> = new Array<Header>();
    /** Request 标记，用于去多个 Request，默认以 url 作为 tag */
    private tag: string = "";
    /**
     * 是否忽略这个任务
     * 某些情况下，有些任务会根据业务逻辑决定执不执行，但链式调用会失去这种灵活性，通过设置此方法可以让队列决定是否执行他
     * 默认为 false
     */
    private isIgnore: () => boolean = () => false;
    /** 配置文件 */
    private requestConfig!: RequestConfig;
    /** 具体执行的任务 */
    private task!: Task<T>;
    /** 成功回调 */
    private successListener?: RequestSuccessListener<T>;
    /** 失败回调 */
    private failListener?: RequestFailListener<T>;
    /** 网络请求前置监听 */
    private frontListener?: Promise<RequestFrontListener<T>>;

    private constructor() {
    }

    public static get<T>(url: string): Request<T> {
        return Request.createRequest<T>(url, RequestMethod.GET);
    }

    public static delete<T>(url: string): Request<T> {
        return Request.createRequest<T>(url, RequestMethod.DELETE);
    }

    public static head<T>(url: string): Request<T> {
        return Request.createRequest<T>(url, RequestMethod.HEAD);
    }

    public static options<T>(url: string): Request<T> {
        return Request.createRequest<T>(url, RequestMethod.OPTIONS);
    }

    public static post<T>(url: string): Request<T> {
        return Request.createRequest<T>(url, RequestMethod.POST);
    }

    public static put<T>(url: string): Request<T> {
        return Request.createRequest<T>(url, RequestMethod.PUT);
    }

    public static patch<T>(url: string): Request<T> {
        return Request.createRequest<T>(url, RequestMethod.PATCH);
    }

    private static createRequest<T>(url: string, method: RequestMethod): Request<T> {
        let request = new Request<T>();
        request.setUrl(url);
        request.setMethod(method);
        return request;
    }

    public setIgnore(isIgnore: () => boolean): Request<T> {
        this.isIgnore = isIgnore;
        return this;
    }

    public getIgnore(): () => boolean {
        return this.isIgnore;
    }

    public setSuccessListener(listener: RequestSuccessListener<T>): Request<T> {
        this.successListener = listener;
        return this;
    }

    public setFailListener(listener: RequestFailListener<T>): Request<T> {
        this.failListener = listener;
        return this;
    }

    public setFrontListener(listener: Promise<RequestFrontListener<T>>): Request<T> {
        this.frontListener = listener;
        return this;
    }

    public getFrontListener(): Promise<RequestFrontListener<T>> | undefined {
        return this.frontListener;
    }

    public getUrl(): string {
        return this.url;
    }

    public setUrl(url: string) {
        this.url = url;
    }

    public getData(): any {
        return this.data || {};
    }

    public setData(data: any): Request<T> {
        this.data = data;
        return this;
    }

    public getMethod(): RequestMethod {
        return this.method;
    }

    public setMethod(method: RequestMethod): Request<T> {
        this.method = method;
        return this;
    }

    public getHeaders(): Array<Header> {
        return this.headers;
    }

    public setHeaders(headers: Array<Header>): Request<T> {
        this.headers = headers;
        return this;
    }

    public addHeader(key: string, value: string): Request<T> {
        this.headers.push(new Header(key, value));
        return this;
    }

    public getTag(): string {
        return this.tag;
    }

    public setTag(tag: string): Request<T> {
        this.tag = tag;
        return this;
    }

    /** 返回当前 Request 使用的 Task */
    public getTask(): Task<T> {
        return this.task;
    }

    public getRequestConfig(): RequestConfig {
        return this.requestConfig;
    }

    /**
     * 初始化 Request 和 Task
     * @param config
     */
    public setRequestConfig(config: RequestConfig): void {
        if (this.requestConfig) {
            Logger.log(TAG, "Request 中已有配置，不再进行初始化");
            return;
        }
        this.requestConfig = config;
        this.buildTask();
    }

    private buildTask(): void {
        this.task = this.requestConfig.task;
        if (!this.task) {
            throw new Error("Request 的 Config 中没有 Task");
        }
        this.task.addSuccessListener((data: T, result: ResponseEntity<T>) => {
            if (this.successListener) {
                this.successListener(data, result);
            }
        });
        this.task.addFailListener((error: ResponseDataEntity<T>) => {
            if (this.failListener) {
                this.failListener(error);
            }
        });
        this.task.initTask(this, this.requestConfig);
    }
}
