import {RequestMethod} from "./enum/MethodEnum";
import axios, {AxiosPromise, CancelTokenSource} from "axios";
import qs from "qs";
import TaskPerformerImpl from "./TaskPerformerImpl";

const TAG = "AxiosTaskImpl";

export default class AxiosTaskImpl<T> extends TaskPerformerImpl<T> {
    private axiosTask!: AxiosPromise<T>;
    private cancelTokenSource!: CancelTokenSource;

    protected createRequest<F>(url: string, method: RequestMethod, data: any, headers: any,
                               callback: (request: any, error: any) => void) {
        this.cancelTokenSource = axios.CancelToken.source();
        this.axiosTask = this.createStandardAxios(url, method, data, headers);
        this.axiosTask.then(result => {
            callback(result, null);
        });
        this.axiosTask.catch(error => {
            callback(null, error);
        });
    }

    protected runAbort() {
        if (this.axiosTask && this.cancelTokenSource) {
            this.cancelTokenSource.cancel("fail abort");
        }
    }

    private createStandardAxios(url: string, method: RequestMethod, data: any, headers: any): AxiosPromise<T> {
        // 如果是表单形式提交，则对 transformRequest 进行特殊处理
        let isForm = headers["content-type"] === "application/x-www-form-urlencoded";
        // 如果是 GET 请求，就将 Key 改为 params
        let dataMode = method === RequestMethod.GET ? "params" : "data";
        let axio = axios({
            // @ts-ignore
            url: url,
            method: method,
            [dataMode]: data,
            headers: headers,
            cancelToken: this.cancelTokenSource.token,
            transformRequest: isForm
                ? [
                    (data: any, headers: any): any => {
                        if (data && headers.post && ~headers.post["Content-Type"].indexOf("form-urlencoded")) {
                            return qs.stringify(data);
                        }
                        return JSON.stringify(data);
                    },
                ] : undefined,
            paramsSerializer: (params: any): any => {
                return qs.stringify(params, {arrayFormat: "repeat"});
            },
            onUploadProgress: (progressEvent: any): any => {
                if (this.uploadProgressListener) {
                    this.uploadProgressListener(progressEvent);
                }
            },
            onDownloadProgress: (progressEvent: any): any => {
                if (this.downloadProgressListener) {
                    this.downloadProgressListener(progressEvent);
                }
            },
        });
        return axio;
    }
}
