export default class Logger {

    public static log(tag: string, ...optionalParams: any) {
        console.log(this.__formatTimestamp(new Date()) + " [INFO] [" + tag + "]", ...optionalParams);
    }

    public static warn(tag: any, ...optionalParams: any) {
        console.warn(this.__formatTimestamp(new Date()) + " [WARN] [" + tag + "]", ...optionalParams);
    }

    public static error(tag: any, ...optionalParams: any) {
        console.error(this.__formatTimestamp(new Date()) + " [ERROR] [" + tag + "]", ...optionalParams);
    }

    public static __formatTimestamp(timestamp: any) {
        let year = timestamp.getFullYear();
        let date = timestamp.getDate();
        let month = ('0' + (timestamp.getMonth() + 1)).slice(-2);
        let hrs = Number(timestamp.getHours());
        let mins = ('0' + timestamp.getMinutes()).slice(-2);
        let secs = ('0' + timestamp.getSeconds()).slice(-2);
        return year + '-' + month + '-' + date + ' ' + hrs + ':' + mins + ':' + secs;
    }

}
