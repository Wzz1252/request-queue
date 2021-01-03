import DataParser from "./DataParser";

const TAG = "DefaultDataParser";

export default class DefaultDataParser<T> implements DataParser<T> {

    public isParser(result: any): boolean {
        return true;
    }

    public dataParser(result: any, error: any,
        success: (data: T) => void,
        fail: (code: string, errorMessage: string, data?: T) => void): void {
        if (result) {
            if (String(result.status) === "200") {
                success(result.data);
            } else {
                fail(result.status, "HTTP 错误", undefined);
            }
        } else if (error) {
            fail("-1", "HTTP 错误", undefined);
        }
    }

}