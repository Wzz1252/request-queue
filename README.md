[TOC]

## 一、配置

通过调用 `RequestQueue.setConfig()` 对 RequestQueue 进行全局配置。此选项可选，如果未配置则会使用默认的配置。

其他配置项请看源码。

```ts
RequestQueue.setConfig(() => {
    let rc = new RequestConfig();
    rc.addDataParser(new DefaultDataParser())
    rc.setTask(new AxiosTaskImpl());
    return rc;
});
```

> 注：推荐在项目的入口进行初始化

## 二、使用方法

### 1. 最简单的请求

发起一个简单的 GET 请求，不考虑是否成功与失败。

```ts
RequestQueue.create(this).request(Request.get<string>("url"));
```

### 2. 标准的请求

发起一个标准的 GET 请求，参数是 `id=123`，成功或失败的时候打印一条消息

```ts
RequestQueue.create(this)
    .request(Request.get<string>("url")
        .setData({id: "123"})
        .setSuccessListener((data: string) => Logger.log(TAG, "success"))
        .setFailListener((error: any) => Logger.log(TAG, "fail"))
    );
```

### 3. 发起多个请求（由每个 Request 处理结果）

由每个 Request 单独处理 `成功/失败` 回调。

```ts
// 同时请求两个接口
RequestQueue.create(this)
    .addRequest(Request.get<T>("url-1").setSuccessListener((data: T) => this.data1 = data))
    .addRequest(Request.get<T>("url-2").setSuccessListener((data: T) => this.data2 = data))
    .setFailListener((error: any) => console.log("error"))
    .request()
```

如果是多个网络请求，必须使用 `addRequest` 添加，再调用 `request` 执行请求队列。

> 注：此时的 request() 不能传值

### 4. 发起多个请求（统一由 RequestQueue 处理结果）

统一由 RequestQueue 来处理 `成功/失败` 回调。

```ts
// 同时请求两个接口
RequestQueue.create(this)
    .addRequest(Request.get<T>("url-1"))
    .addRequest(Request.get<T>("url-2"))
    // 每个接口成功后都会执行一次 successListener 监听，可以通过判断 url 来区别不同的接口
    .setSuccessListener((data: any, result: ResponseEntity<any>) => {
        if (result.request.getUrl() === "url-1") {
            this.data1 = data as string;
        } else if (result.request.getUrl() === "url-1") {
            this.data2 = data as number;
        }
    })
    .setFailListener((error: any) => console.log("error"))
    .setCompleteListener(() => {})
    .request()
```

交给 RequestQueue 后，每次执行完一个 Request 后，RequestQueue.setSuccessListener() 都会被触发一次，可以在该方法内部统一处理所有请求的数据，直至所有请求完成。同理，如果出现请求失败的情况会触发 `RequestQueue.setFailListener()` 方法，同时终止其他未完成的 Request。

这里需要说明的是 `RequestQueue.setCompleteListener()` 不管请求成功还是请求失败到最后都会执行，可以在该方法内做一些收尾工作。

### 5. 并行执行所有请求

这是默认的方式，不做任何设置就是并行，如果想切换到并行只需要在 `addRequest` 前调用 `belowParallel()` 即可。

```ts
RequestQueue.create(this)
    .addRequest(Request.get<string>("url"))
    .addRequest(Request.get<string>("url"))
    .request();
```

### 6. 串行执行所有请求

如果想切换到并行只需要在 `addRequest` 前调用 `belowSerial()` 即可。

```ts
RequestQueue.create(this)
    .belowSerial() // 并行执行下面的请求
    .addRequest(Request.get<T>("url"))
    .addRequest(Request.get<T>("url"))
    .request();
```

### 7. 执行组合请求

通过 `belowParallel()` 和 `belowSerial()` 可依据项目需求自由组合多个网络请求。

```ts
RequestQueue.create(this)
    .belowParallel() // 并行执行下面的请求
    .addRequest(Request.get<T>("url"))
    .addRequest(Request.get<T>("url"))
    .belowSerial()   // 串行执行下面的请求
    .addRequest(Request.get<T>("url"))
    .addRequest(Request.get<T>("url"))
    // 处理状态
    .setSuccessListener((data: any) => Logger.log(TAG, "success"))
    .setFailListener((error: any) => Logger.log(TAG, "fail"))
    .setCompleteListener(() => Logger.log(TAG, "complete"))
    .request();
```

## 三、自定义 DataParser 和 Task

### 1. 自定义 DataParser

RequestQueue 提供一个默认的 `DefaultDataParser` ，这个解析器仅仅是返回服务器的原始数据，不做任何处理。但通常情况下每个项目都会有一套自己的数据规范，此时可以通过实现 `DataParser` 接口来编写自己的解析器。

例如：

```json
{
    code: 200,
    message: "测试数据",
    data: {
        name: "test"
    }
}
```

通过实现 `DataParser` 来编写自己的解析器，来完成对上面数据的解析。

`isParser` 和 `dataParser` 是必须要实现的两个方法，第一个用来判断是否使用该解析器，第二个用来解析数据。

```ts
export default class TestDataParser<T> implements DataParser<T> {
    public isParser(result: any): boolean {
        if ("code" in result.data && "message" in result.data && "data" in result.data) {
            return true;
        }
        return false;
    }
    public dataParser(result: any, error: any,
                      success: (data: T) => void,
                      fail: (code: string, errorMessage: string, data?: T) => void): void {
        if (result) {
            if (String(result.status) === "200") {
                let data = result.data;
                if (String(data.code) === "200") {
                    success(result.data);
                } else {
                    fail(result.code, result.message, result);
                }
            } else {
                fail(result.status, "HTTP 错误", undefined);
            }
        } else if (error) {
            fail("-1", "HTTP Error", undefined);
        }
    }
}
```

编写完自定义的解析器后，只需通过 `RequestConfig.addDataParser()` 添加即可。

### 2. 自定义 Task

RequestQueue 提供一个默认的 `AxiosTaskImpl` ，基于 Axios 网络库，如果想在微信小程序、uni-app等其他平台使用，可以通过继承 `TaskPerformerImpl` 来实现自己的 Task。

`createRequest` 和 `runAbort` 是必须要实现的两个方法，第一个用来创建使用的网络库，第二个用来终止请求。

```js
export default class AxiosTaskImpl<T> extends TaskPerformerImpl<T> {
    private axiosTask!: AxiosPromise<T>;
    private cancelTokenSource!: CancelTokenSource;

    protected createRequest<F>(url: string, method: RequestMethod, data: any, headers: any,
                               callback: (request: any, error: any) => void) {
        this.cancelTokenSource = axios.CancelToken.source();
        this.axiosTask = this.createStandardAxios(url, method, data, headers);
        this.axiosTask.then(result => {
            callback(result, null);
        });
        this.axiosTask.catch(error => {
            callback(null, error);
        });
    }

    protected runAbort() {
        if (this.axiosTask && this.cancelTokenSource) {
            this.cancelTokenSource.cancel("fail abort");
        }
    }

    private createStandardAxios(url: string, method: RequestMethod, data: any, headers: any): AxiosPromise<T> {
        let axio = axios({
            url: url,
            method: method,
            data: data,
            headers: headers,
            cancelToken: this.cancelTokenSource.token
        });
        return axio;
    }
}

```

## 四、结构

```yaml
- interface: Task                               接口
  - abstract class: TaskPerformerImpl           基础的 Task 逻辑实现
    - class: AxiosTaskImpl                      Axios 的具体实现
- interface: TaskQueue                          队列模式
  - class: TaskQueueParallelImpl                并行模式具体实现
  - class: TaskQueueSerialImpl                  串行模式具体实现
- interface: DataParser                         数据解析器
  - class: DefaultDataParser                    返回原始数据
  - class: StringDataParser                     返回字符形式的原始数据
- class: RequestConfig                          配置文件
- class: Request                                请求体
- class: RequestQueue                           请求队列
- interface: RequestSuccessListener             成功回调
- interface: RequestFailListener                失败回调
- interface: RequestCompleteListener            完成回调
- interface: RequestUploadProgressListener      文件上传进度回调
- interface: RequestDownloadProgressListener    文件下载进度回调
- interface: RequestFrontListener               Request 前置回调
```

编写完自定义的 Task 后，只需通过 `RequestConfig.setTask()` 添加即可。

## 五、API

### 1. Request API

##### `static get<T>(url: string): Request<T>`
`静态` 创建一个 GET 请求
- url: 请求地址

##### `static post<T>(url: string): Request<T>`
`静态` 创建一个 POST 请求
- url: 请求地址

##### `static put<T>(url: string): Request<T>`
`静态` 创建一个 PUT 请求
- url: 请求地址

##### `static delete<T>(url: string): Request<T>`
`静态` 创建一个 DELETE 请求
- url: 请求地址

##### `static head<T>(url: string): Request<T>`
`静态` 创建一个 HEAD 请求
- url: 请求地址

##### `static options<T>(url: string): Request<T>`
`静态` 创建一个 OPTIONS 请求
- url: 请求地址

##### `static patch<T>(url: string): Request<T>`
`静态` 创建一个 PATCH 请求
- url: 请求地址

##### `setTag(tag: string): Request<T>`
创建一个标记，用来区分 Request

##### `setIgnore(isIgnore: () => boolean): Request<T>`
在 RequestQueue 执行到此 Request 时，是否忽略此 Request

setIgnore() 接受一个返回类型是 boolean 的 Function

- isIgnore: true 忽略，false 不忽略

##### `setRetry(retry: number): Request<T>`
重试次数，默认为 0

##### `setRequestConfig(requestConfig: RequestConfig): Request<T>`
无视，还未开发完

##### `setTask(task: Task<T>): Request<T>`
支持为每个 Request 设置单独的 Task，目前支持的 Task 有：

- TaskAxiosImpl: 基于 axios 实现
- TaskWxImpl: 基于小程序的 Request 实现
- TaskUniImpl: 基于 UniApp 的 Request 实现

如果想根据不同的平台实现不同的 Task，只需要实现 Task 接口，然后编写逻辑代码即可。

##### `setData(data: any): Request<T>`
Request 的请求参数，data 类型为 any，可以传递各种类型的对象

例如：
```ts
{
    id: 111,
    user: "username",
    array: [1, 2, 3, ...],
    sArray: [{id: 1}, {id: 2}, ...]
}

[1, 2, 3, ...]

[{id: 1}, {id: 2}, ...]
```

> 注意：data 如果为 Object 类型，这时 value 会有一些隐性规定
> - 如果 value 为 null 或 undefined 时，Task 会将指定的 key 从请求体中删除
> - 如果 value 为 ""，Task 不会处理

例如：
```ts
// 构建的参数
{
    id: 123,
    username: "",
    password: null
}
// Task 处理过后的数据
{
    id: 123,
    username: ""
}
```

##### `setMethod(method: RequestMethod): Request<T>`
设置 Request 的请求类型，通常情况下直接使用 Request.get... 相关方法即可，但在某些特殊的情况下，可以配合 setFrontListener() 来改变当前 Request 的请求类型

##### `setHeaders(headers: Array<Header>): Request<T>`
批量添加请求头

例如：
```ts
let headers: Array<Header> = new Array<Header>();
headers.push(new Header("key", "value"))
headers.push(new Header("key", "value"))
Request.get<string>("url").addHeader(headers)
```

> 注意：使用 setHeaders 时，会覆盖原有 Request 中的 headers

##### `addHeader(key: string, value: string): Request<T>`
添加一个请求头

##### `setFrontListener(listener: Promise<RequestFrontListener<T>>): Request<T>`
请求前置监听

setFrontListener 接受一个 Promise 对象，可以处理耗时任务，当处理耗时任务时，整个 RequestQueue 会停下来等待 front 的完成

例如：
```ts
Request.get<string>("url")
    // 假设 getWxCode 为异步函数，获取 code 需要 1 秒
    // 此时可以通过 front 函数，当 code 获取成功后再往下执行
    .setFrontListener(async (request: Request<string>) => {
        request.getData()["code"] = await this.getWxCode();
    }));
```

> 注意：此监听只在 TaskQueue 为 TaskQueueSerialImpl 时才会生效

##### `setSuccessListener(listener: RequestSuccessListener<T>): Request<T>`
请求成功监听

##### `setFailListener(listener: RequestFailListener<T>): Request<T>`
请求失败监听

##### `public setDownloadProgressListener(listener: RequestDownloadProgressListener): Request<T>`
文件下载进度监听

##### `setUploadProgressListener(listener: RequestUploadProgressListener): Request<T>`
文件上传进度监听

### 2. RequestQueue API

##### `static create(context?: BaseVue): RequestQueue`
`静态` 创建一个 RequestQueue 队列

- context: 页面的上下文，每个页面必须继承自 BaseVue

##### `setShowLoading(isShowloading: boolean, loadingTarget: string): RequestQueue`
是否显示加载中动画

- isShowloading: true 开启、false 关闭【默认 false】
- loadingTarget: 在哪个 div 上面显示加载动画，不传默认是全屏，参数例子："#app-layout"

##### `setShowErrorMessage(isShowErrorMessage: boolean): RequestQueue`
是否显示服务器返回的错误信息

- isShowErrorMessage: true 开启、false 关闭【默认 true】

##### `addRequest<T>(request: Request<T>): RequestQueue`
将一个 Request 添加到队列中

##### `request<T>(request?: Request<T>): void`
执行请求队列

- request 如果不传参数，将直接执行队列
- request 如果传了参数，会创建一个队列并执行

> 注意：一旦使用了 addRequest() 方法，那 request() 的形参不能传

##### `belowSerial<T>(): RequestQueue`
添加一个串行队列

> 注意：在 belowSerial() 之后调用 addRequest()，请求会放入串行队列中

##### `belowParallel<T>(): RequestQueue`
添加一个并行队列

> 注意：在 belowParallel() 之后调用 addRequest()，请求会放入并行队列中

----------

> **belowSerial() 和 belowParallel() 注意事项：**
>
> 每个 RequestQueue 都有一个主队列，这个主队列是串行队列，每当调用一次 belowSerial()
> 或 belowParallel() 时，都会在主队列中创建一个子队列（串行队列或并行队列），当执行
> request() 方法时，RequestQueue 会依次遍历主队列中的子队列，只有当当前子队列中的任务
> 完成后，才会继续执行下一个子队列。

如果想实现特殊的队列，只需要实现 TaskQueue 接口，然后编写自己的队列逻辑即可。

----------

##### `setSuccessListener(listener: RequestSuccessListener<any>): RequestQueue`
Request 成功监听，每成功一个 Request，次方法都会被执行一次

##### `setFailListener(listener: RequestFailListener<any>): RequestQueue`
Request 失败监听，只要有一个 Request 失败，此方法就会被回调，同时会停止当前的 RequestQueue

##### `setCompleteListener(listener: RequestCompleteListener): RequestQueue`
当 RequestQueue 中的所有任务执行完成后，此方法会被回调