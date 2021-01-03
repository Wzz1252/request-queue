export default interface RequestContext {
    requestSuccess(): void;

    requestFail(message: string): void;
}