import Header from "./entity/Header";
import {ResponseTypeEnum} from "./enum/ResponseTypeEnum";
import Task from "./Task";
import DataParser from "./DataParser";
import AxiosTaskImpl from "./AxiosTaskImpl";

export default class RequestConfig {
    private _baseUrl?: string;
    private _timeout?: number;
    private _headers?: Array<Header>;
    private _withCredentials?: boolean;
    private _auto?: Header;
    private _responseType?: ResponseTypeEnum;
    private responseEncoding?: any;
    private xsrfCookieName?: any;
    private xsrfHeaderName?: any;
    private maxContentLength?: number;
    private validateStatus?: Function;
    private maxRedirects?: number;
    private _retry?: number;
    private _task?: Task<any>;
    private _dataParser?: Array<DataParser<any>>;

    public get baseUrl() {
        return this._baseUrl || "";
    }

    public set baseUrl(baseUrl: string) {
        this._baseUrl = baseUrl;
    }

    public get timeout() {
        return this._timeout || 1000;
    }

    public set timeout(timeout: number) {
        this._timeout = timeout;
    }

    public get headers() {
        return this._headers || new Array<Header>();
    }

    public set headers(headers: Array<Header> | Header) {
        if (headers instanceof Header) {
            this._headers = new Array<Header>(headers);
        } else {
            this._headers = headers;
        }
    }

    public getHeaders():Array<Header> {
        return this._headers || new Array<Header>();
    }

    public get withCredentials() {
        return this._withCredentials || false;
    }

    public set withCredentials(withCredentials: boolean) {
        this._withCredentials = withCredentials;
    }

    public get auto(): Header | undefined {
        return this._auto || undefined;
    }

    public set auto(auto: Header | undefined) {
        this._auto = auto;
    }

    public get responseType() {
        return this._responseType || ResponseTypeEnum.JSON;
    }

    public set responseType(responseType: ResponseTypeEnum) {
        this._responseType = responseType;
    }

    public get task() {
        // TODO 还未写完
        return this._task || new AxiosTaskImpl();
    }

    public set task(task: Task<any>) {
        this._task = task;
    }

    public setTask(task: Task<any>): void {
        this._task = task;
    }

    public get retry() {
        return this._retry || 0;
    }

    public set retry(retry: number) {
        this._retry = retry;
    }

    public addDataParser(dataParser: DataParser<any>): void {
        if (!this._dataParser) {
            this._dataParser = new Array<DataParser<any>>();
        }
        this._dataParser.push(dataParser);
    }

    public get dataParser() {
        return this._dataParser || new Array<DataParser<any>>();
    }

    public set dataParser(dataParser: Array<DataParser<any>>) {
        this._dataParser = dataParser;
    }
}