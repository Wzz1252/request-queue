/**
 * 字符串工具类
 */
export default class RequestUtils {
    /**
     * 判断字符是否为空的方法
     */
    public static isEmpty(obj: any): boolean {
        return obj == null || typeof obj === "undefined" || obj === "";
    }

    // /**
    //  * 深克隆
    //  * @param o 要克隆的对象
    //  */
    // public static deepClone(o: any): any {
    //     // 判断如果不是引用类型，直接返回数据即可
    //     if (typeof o === 'string' || typeof o === 'number' || typeof o === 'boolean' || typeof o === 'undefined') {
    //         return o;
    //     } else if (Array.isArray(o)) { // 如果是数组，则定义一个新数组，完成复制后返回
    //         // 注意，这里判断数组不能用typeof，因为typeof Array 返回的是object
    //         let _arr: Array<any> = [];
    //         o.forEach(item => {
    //             _arr.push(item)
    //         });
    //         return _arr || [];
    //     } else if (typeof o === 'object') {
    //         let _o: any = {};
    //         for (let key in o) {
    //             _o[key] = this.deepClone(o[key]);
    //         }
    //         return _o || {};
    //     }
    //     return {};
    // }

    public static deepClone(data: any) {
        const type = this.judgeType(data);
        let obj;
        if (type === 'array') {
            obj = [];
        } else if (type === 'object') {
            obj = {};
        } else {
            // 不再具有下一层次
            return data;
        }
        if (type === 'array') {
            // eslint-disable-next-line
            for (let i = 0, len = data.length; i < len; i++) {
                // @ts-ignore
                obj.push(this.deepClone(data[i]));
            }
        } else if (type === 'object') {
            // 对原型上的方法也拷贝了....
            // eslint-disable-next-line
            for (const key in data) {
                // @ts-ignore
                obj[key] = this.deepClone(data[key]);
            }
        }
        return obj;
    }

    public static judgeType(obj: any) {
        // tostring会返回对应不同的标签的构造函数
        const toString = Object.prototype.toString;
        const map = {
            '[object Boolean]': 'boolean',
            '[object Number]': 'number',
            '[object String]': 'string',
            '[object Function]': 'function',
            '[object Array]': 'array',
            '[object Date]': 'date',
            '[object RegExp]': 'regExp',
            '[object Undefined]': 'undefined',
            '[object Null]': 'null',
            '[object Object]': 'object',
        };
        if (obj instanceof Element) {
            return 'element';
        }
        // @ts-ignore
        return map[toString.call(obj)];
    }
}
