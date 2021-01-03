export default class ResponseDataEntity<T extends any | Array<any>> {
    code: string = "1";
    data!: T;
    message: string = "";
}
