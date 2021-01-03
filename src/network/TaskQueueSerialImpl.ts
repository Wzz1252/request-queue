import TaskQueue from "./TaskQueue";
import Task from "./Task";
import RequestFailListener from "./RequestFailListener";
import RequestSuccessListener from "./RequestSuccessListener";
import RequestCompleteListener from "./RequestCompleteListener";
import ResponseEntity from "./entity/ResponseEntity";
import ResponseDataEntity from "./entity/ResponseDataEntity";
import { RequestState } from "./enum/RequestState";
import Logger from "./Logger";

const TAG = "NewTaskQueueSerialImpl";
/**
 * 串行队列任务
 */
export default class TaskQueueSerialImpl<T extends any> implements TaskQueue<T> {
    public requestTasks: Array<Task<T>> = new Array<Task<T>>();

    public failListener?: RequestFailListener<T>;
    public successListener?: RequestSuccessListener<T>;
    public completeListener?: RequestCompleteListener;

    public run(): void {
        if (this.requestTasks.length <= 0) {
            if (this.completeListener) {
                this.completeListener();
            }
            return;
        }
        this.nextRequest(this.requestTasks, 0);
    }

    public nextRequest(requestTasks: Array<Task<T>>, index: number): void {
        let task = requestTasks[index];
        if (!task) {
            return;
        }
        let request = task.getRequest();
        let ignore = request.getIgnore();
        // 是不是被忽略，如果忽略直接走下一个
        if (ignore && ignore()) {
            Logger.log(TAG, request.getMethod(), request.getUrl(), "将被忽略。");
            index++;
            this.nextRequest(requestTasks, index);
        } else {
            task.addSuccessListener((data: T, result: ResponseEntity<T>) => {
                index++;
                if (this.successListener) {
                    this.successListener(data, result);
                }
                if (this.isAllFinish() && this.completeListener) {
                    this.completeListener();
                }
                this.nextRequest(requestTasks, index);
            });
            task.addFailListener((error: ResponseDataEntity<T>) => {
                this.abort();
                if (this.failListener) {
                    this.failListener(error);
                }
            });
            task.run();
        }
    }

    public setSuccessListener(listener: RequestSuccessListener<T>): void {
        this.successListener = listener;
    }

    public setFailListener(listener: RequestFailListener<T>): void {
        this.failListener = listener;
    }

    public setCompleteListener(listener: RequestCompleteListener): void {
        this.completeListener = listener;
    }

    /**
     * 终止所有任务
     */
    public abort(): void {
        for (let i = 0; i < this.requestTasks.length; i++) {
            this.requestTasks[i].abort();
        }
    }

    /**
     * 任务队列是否全部完成
     * @return true: 全部完成 false: 未完成或有错误
     */
    public isAllFinish(): boolean {
        let requestNum = this.requestTasks.length;
        let successCount = 0;
        for (let i = 0; i < requestNum; i++) {
            let task = this.requestTasks[i];
            let request = task.getRequest();
            let ignore = request.getIgnore();
            // 请求成功或者被忽略
            if (task.getState() === RequestState.SUCCESS || (ignore && ignore())) {
                successCount++;
            }
        }
        return requestNum === successCount;
    }

    public setRequestTasks(task: Task<T>): void {
        this.requestTasks.push(task);
    }
}
