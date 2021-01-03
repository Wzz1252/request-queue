import Request from "./Request";

/**
 * 前置网络请求监听器
 */
export default interface RequestFrontListener<T> {
    (request: Request<T>): void;
}
