import RequestSuccessListener from "./RequestSuccessListener";
import RequestFailListener from "./RequestFailListener";
import RequestConfig from "./RequestConfig";
import {RequestState} from "./enum/RequestState";
import Request from "./Request";

export default interface Task<T> {
    initTask(request: Request<T>, requestConfig: RequestConfig): void;

    run(): void;

    abort(): void;

    addSuccessListener(listener: RequestSuccessListener<T>): void;

    addFailListener(listener: RequestFailListener<T>): void;

    getState(): RequestState;

    getRequest(): Request<T>;

    setRequest(request: Request<T>): void;

}
