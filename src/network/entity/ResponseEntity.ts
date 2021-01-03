import ResponseDataEntity from "./ResponseDataEntity";
import Request from "../Request";

export default class ResponseEntity<T extends any | Array<any>> {
    cookies = [];
    data!: ResponseDataEntity<T>;
    headers: any = {};
    request!: Request<T>;
    statusCode: number = 0;
}
