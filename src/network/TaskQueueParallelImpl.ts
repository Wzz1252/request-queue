import TaskQueue from "./TaskQueue";
import Task from "./Task";
import RequestSuccessListener from "./RequestSuccessListener";
import RequestFailListener from "./RequestFailListener";
import RequestCompleteListener from "./RequestCompleteListener";
import ResponseEntity from "./entity/ResponseEntity";
import ResponseDataEntity from "./entity/ResponseDataEntity";
import {RequestState} from "./enum/RequestState";

const TAG = "NewTaskQueueParallelImpl";
/**
 * 并行队列任务
 */
export default class TaskQueueParallelImpl<T extends any> implements TaskQueue<T> {
    public requestTasks: Array<Task<T>> = new Array<Task<T>>();

    public successListener?: RequestSuccessListener<T>;
    public failListener?: RequestFailListener<T>;
    public completeListener?: RequestCompleteListener;

    public run(): void {
        if (this.requestTasks.length <= 0) {
            if (this.completeListener) {
                this.completeListener();
            }
            return;
        }

        let isFinish = true;
        for (let i = 0; i < this.requestTasks.length; i++) {
            let task = this.requestTasks[i];
            task.addSuccessListener((data: T, result: ResponseEntity<T>) => {
                if (this.successListener) {
                    this.successListener(data, result);
                }
                if (this.isAllFinish() && this.completeListener) {
                    this.completeListener();
                }
            });
            task.addFailListener((error: ResponseDataEntity<T>) => {
                isFinish = false;
                this.abort();
                if (this.failListener) {
                    this.failListener(error);
                }
            });
            task.run();
        }
    }

    /**
     * 终止所有任务
     */
    public abort(): void {
        for (let i = 0; i < this.requestTasks.length; i++) {
            this.requestTasks[i].abort();
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
     * 任务队列是否全部完成
     * @return true: 全部完成 false: 未完成或有错误
     */
    public isAllFinish(): boolean {
        let requestNum = this.requestTasks.length;
        let successCount = 0;
        for (let i = 0; i < requestNum; i++) {
            let task = this.requestTasks[i];
            if (task.getState() === RequestState.SUCCESS) {
                successCount++;
            }
        }
        return requestNum === successCount;
    }

    public setRequestTasks(task: Task<T>): void {
        this.requestTasks.push(task);
    }
}