import ResponseDataEntity from "./entity/ResponseDataEntity";

export default interface RequestFailListener<T> {
    (error: ResponseDataEntity<T>): void;
}
