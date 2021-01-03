import RequestQueue from "../network/RequestQueue";
import RequestConfig from "../network/RequestConfig";
import DefaultDataParser from "../network/DefaultDataParser";
import AxiosTaskImpl from "../network/AxiosTaskImpl";
import Request from "../network/Request";
import Logger from "../network/Logger";
import KanCloudEntity from "./KanCloudEntity";
import StringDataParser from "../network/StringDataParser";
import RequestContext from "../network/RequestContext";

const url1 = "https://plugins.kancloud.cn/api/plugin/info?book=26419&name=theme-default,highlight";
const url2 = "https://plugins.kancloud.cn/api/plugin/info?book=26419&name=theme-default";

export default class TestRequest implements RequestContext {

    public run(): void {

        RequestQueue.setConfig(() => {
            let rc = new RequestConfig();
            rc.addDataParser(new DefaultDataParser())
            rc.addDataParser(new StringDataParser())
            rc.setTask(new AxiosTaskImpl());
            return rc;
        });

        RequestQueue.create(this)
            .addRequest(Request.get<Array<KanCloudEntity>>(url1)
                .setData({test: "test"})
                .addHeader("xxx", "xxx")
                .setIgnore(() => false)
                .setFrontListener(new Promise((success, fail) => {
                }))
                .setSuccessListener(() => console.log("success"))
                .setFailListener(() => console.log("fail"))
            )
            .addRequest(Request.get<Array<KanCloudEntity>>(url2))
            .belowParallel()
            .addRequest(Request.get<Array<KanCloudEntity>>(url1))
            .addRequest(Request.get<Array<KanCloudEntity>>(url2))
            .belowSerial()
            .addRequest(Request.get<Array<KanCloudEntity>>(url1))
            .addRequest(Request.get<Array<KanCloudEntity>>(url2))
            .setSuccessListener(() => console.log("success"))
            .setFailListener(() => console.log("fail"))
            .setCompleteListener(() => console.log("complete"))
            .request();
    }

    public requestFail(message: string): void {
    }

    public requestSuccess(): void {
    }

}