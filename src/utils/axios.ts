import Axios, {AxiosError, AxiosResponse, InternalAxiosRequestConfig} from 'axios';
import qs from 'qs';

export default function axios({debug = false, ...config}) {
    const result = Axios.create(config);
    result.interceptors.request.use(stringifyBody);
    result.interceptors.request.use(requestLogger(debug));
    result.interceptors.response.use(responseLogger(debug), rejectLogger(debug));
    return result;
}

function requestLogger(debug: boolean) {
    return function (config: InternalAxiosRequestConfig) {
        if (debug) {
            const {method, baseURL, url, data, headers, params: query, auth} = config;
            const {common, delete: del, get, head, post, put, patch, ...rest} = headers;
            const _headers = {
                ...common,
                ...({delete: del, get, head, post, put, patch}[method as string]),
                ...rest,
            };
            console.log(`Request: ${JSON.stringify({
                method: (method as string).toUpperCase(),
                baseURL,
                url,
                query,
                headers: _headers,
                auth,
                data,
            }, null, 2)}`);
        }
        return config;
    };
}

function responseLogger(debug: boolean) {
    return function (resp: AxiosResponse) {
        if (debug) {
            const {status, statusText, headers, data} = resp;
            console.log(`Response: ${JSON.stringify({
                status,
                statusText,
                headers,
                data,
            }, null, 2)}`);
        }
        return resp;
    };
}

function rejectLogger(debug: boolean) {
    return function (error: AxiosError) {
        if (debug) {
            let _error: any = error;
            if (_error.response) {
                _error = {
                    ..._error.response,
                    request: undefined,
                };
            }
            console.error(JSON.stringify(_error, null, 2));
        }
        return Promise.reject(error);
    };
}

function stringifyBody(config: InternalAxiosRequestConfig) {
    if (config.headers['Content-Type'] === 'application/x-www-form-urlencoded') {
        config.data = qs.stringify(config.data);
    }
    return config;
}
