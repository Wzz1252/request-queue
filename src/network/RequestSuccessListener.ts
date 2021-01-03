import ResponseEntity from "./entity/ResponseEntity";

export default interface RequestSuccessListener<T> {
    (data: T, result: ResponseEntity<T>): void;
}
