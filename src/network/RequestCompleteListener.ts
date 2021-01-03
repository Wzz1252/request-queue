/**
 * 当队列中的任务全部执行完成时，执行
 */
export default interface RequestCompleteListener {
    (): void;
}
