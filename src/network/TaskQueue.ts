import RequestFailListener from "./RequestFailListener";
import RequestSuccessListener from "./RequestSuccessListener";
import RequestCompleteListener from "./RequestCompleteListener";
import Task from "./Task";

export default interface TaskQueue<T extends any> {
    /**
     * 开始执行任务
     * @param success   成功回调
     * @param fail      失败回调
     */
    run(): void;

    setRequestTasks(tasks: Task<T>): void;

    setSuccessListener(listener: RequestSuccessListener<T>): void;

    setFailListener(listener: RequestFailListener<T>): void;

    setCompleteListener(listener: RequestCompleteListener): void;

    isAllFinish(): boolean;
}
