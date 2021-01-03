import Logger from "./Logger";
import RequestCompleteListener from "./RequestCompleteListener";
import RequestContext from "./RequestContext";
import RequestFailListener from "./RequestFailListener";
import RequestSuccessListener from "./RequestSuccessListener";
import Task from "./Task";
import TaskQueue from "./TaskQueue";
import Request from "./Request";
import TaskQueueSerialImpl from "./TaskQueueSerialImpl";
import TaskQueueParallelImpl from "./TaskQueueParallelImpl";
import RequestConfig from "./RequestConfig";
import ResponseEntity from "./entity/ResponseEntity";
import ResponseDataEntity from "./entity/ResponseDataEntity";
import AxiosTaskImpl from "./AxiosTaskImpl";
import DefaultDataParser from "./DefaultDataParser";

const TAG = "RequestQueue";

export default class RequestQueue {
    /**
     * 默认磁盘缓存 2MB
     * TODO 未完成的逻辑，等有时间补上
     */
    private DEFAULT_DISK_USAGE_BYTES: number = 2 * 1024 * 1024;
    /**
     * 默认的全局配置文件，可在工程入口通过 setConfig() 进行设置。
     * 在使用 Request 时可设置单独的 Config，如果不设置则默认使用这个配置
     */
    private static requestConfig: () => RequestConfig;
    /**
     * 上下文，使用 RequestQueue 的类可实现 RequestContext 接口，处理一些非请求本身的操作。
     * 例如：成功/失败时的页面提示、日志保存等
     */
    private context?: RequestContext;
    private requestQueue: Array<TaskQueue<any>> = new Array<TaskQueue<any>>();
    /**
     * 配置文件
     */
    private config!: RequestConfig;
    /**
     * 每执行一次 {@link belowSerial()} 和 {@link belowParallel()} 游标都会加一。
     * 游标用来确定 RequestQueueTask 在队列中的位置
     */
    private belowCursor: number = -1;
    /**
     * 是否在请求的时候显示一个全局加载框
     * 依赖 {@link context}
     */
    private isShowLoading: boolean = false;
    /**
     * 是否显示错误提示
     * 依赖 {@link context}
     */
    private isShowErrorMessage: boolean = true;
    /**
     * 当前队列请求是否已经取消，如果取消将忽略其余的成功与错误回调
     */
    private canceled: boolean = false;

    private successListener?: RequestSuccessListener<any>;
    private failListener?: RequestFailListener<any>;
    private completeListener?: RequestCompleteListener;

    private constructor(context?: RequestContext) {
        this.context = context;
    }

    /**
     * 设置一个全局的配置项，推荐在程序入口配置
     * @param config 全局配置
     */
    public static setConfig(config: () => RequestConfig) {
        RequestQueue.requestConfig = config;
    }

    /**
     * 创建一个请求队列
     * @param context Vue 的上下文
     */
    public static create(context?: RequestContext): RequestQueue {
        let queue = new RequestQueue(context);
        queue.belowParallel();
        return queue;
    }

    /**
     * 开始执行请求
     * request 非必传，这里有些规定
     * 1. 如果只有一个请求，通过 request(Request.get(...)) 直接执行
     * 2. 如果有多个请求，通过 addRequest 添加，最后通过 request() 执行，此时 request 不能传入任何值
     */
    public request<T>(request?: Request<T>): void {
        if (request) {
            this.addRequest(request);
            this.request();
        } else {
            let requestQueue = this.requestQueue || [];
            if (requestQueue.length <= 0) {
                Logger.log(TAG, "任务队列是空的，终止任务");
                return;
            }
            this.nextTaskQueue(this.requestQueue, 0);
        }
    }

    /**
     * 添加一个请求到队列
     * @param request 添加一个请求
     */
    public addRequest<T>(request: Request<T>): RequestQueue {
        let queue = this.getTaskQueue();
        if (!queue) {
            throw new Error("TaskQueue 出现错误!");
        }
        request.setRequestConfig(RequestQueue.requestConfig());
        queue.setRequestTasks(request.getTask());
        return this;
    }

    /**
     * 添加串行队列
     * 在此方法下面的 {@link addRequest()} 都会串行执行
     */
    public belowSerial<T>(): RequestQueue {
        let queueTask = new TaskQueueSerialImpl<T>();
        queueTask.requestTasks = new Array<Task<T>>();
        this.requestQueue.push(queueTask);
        this.belowCursor++;
        return this;
    }

    /**
     * 添加并行队列
     * 在此方法下面的 {@link addRequest()} 都会并行执行
     */
    public belowParallel<T>(): RequestQueue {
        let queueTask = new TaskQueueParallelImpl<T>();
        queueTask.requestTasks = new Array<Task<T>>();
        this.requestQueue.push(queueTask);
        this.belowCursor++;
        return this;
    }

    public setSuccessListener(listener: RequestSuccessListener<any>): RequestQueue {
        this.successListener = listener;
        return this;
    }

    public setFailListener(listener: RequestFailListener<any>): RequestQueue {
        this.failListener = listener;
        return this;
    }

    public setCompleteListener(listener: RequestCompleteListener): RequestQueue {
        this.completeListener = listener;
        return this;
    }

    public getConfig(): RequestConfig {
        return this.config;
    }

    public setConfig(config: RequestConfig): void {
        this.config = config
    }

    private getTaskQueue(): TaskQueue<any> | undefined {
        return this.requestQueue[this.belowCursor === -1 ? 0 : this.belowCursor] || undefined;
    }

    private showLoading(): void {
        if (this.isShowLoading && this.context) {
            this.context.requestSuccess();
        }
    }

    private closeLoading(): void {
        if (this.isShowLoading && this.context) {
            this.context.requestFail("");
        }
    }

    private buildConfig(): RequestConfig {
        let rc = new RequestConfig();
        rc.addDataParser(new DefaultDataParser())
        rc.task = new AxiosTaskImpl();
        return rc;
    }

    /**
     * 遍历队列并依次执行
     * @param taskQueue 推荐
     * @param count     计数
     * @private
     */
    private nextTaskQueue<T>(taskQueue: Array<TaskQueue<T>>, count: number): void {
        let task = taskQueue[count];
        if (task) {
            task.setSuccessListener((data: T, result: ResponseEntity<T>) => {
                if (this.canceled) {
                    return;
                }
                if (this.successListener) {
                    this.successListener(data, result);
                }
            });
            task.setFailListener((error: ResponseDataEntity<T>) => {
                if (this.canceled) {
                    return;
                }
                if (this.failListener) {
                    this.failListener(error);
                }
                this.closeLoading();
                if (this.isShowErrorMessage && this.context) {
                    this.context.requestFail(error.code + ": " + error.message);
                }
                this.canceled = true;
                return;
            });
            task.setCompleteListener(() => {
                count++;
                this.nextTaskQueue(taskQueue, count);
            });
            this.showLoading();
            task.run();
        } else {
            // 全部结束
            if (this.completeListener) {
                this.completeListener();
            }
            this.closeLoading();
            return;
        }
    }

}