export default interface DataParser<T> {

    /**
     * 根据服务器返回的数据格式进行匹配，如果不符合则不使用此解析器
     * @param result 数据
     */
    isParser(result: any): boolean;

    /**
     * 解析服务器返回的数据，哪些属于正确，哪些属于错误
     * - 如果数据正确，手动调用 success 并传入要返回的数据
     * - 如果数据错误，手动调用 fail 并传入要返回的数据
     * @param result    服务器返回的数据
     * @param error     HTTP请求异常
     * @param success   通知成功
     * @param fail      通知失败
     */
    dataParser(result: any, error: any,
               success: (data: T) => void,
               fail: (code: string, errorMessage: string, data?: T) => void): void;
}