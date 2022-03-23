import MyService from './my.service'
import { Client, Request } from '@pepperi-addons/debug-server'
import { PapiClient } from '@pepperi-addons/papi-sdk'

export async function get_header_data_from_sql(client: Client, request: Request){
    const service = new MyService(client)
    const res = await service.GetHeaderDataFromSQL(request.query["order_id"]);
    return res;
}

export async function get_sql_data(client: Client, request: Request){
    const service = new MyService(client)
    const res = await service.GetSQLData(request.query["order_id"]);
    return res;
}

export async function get_kibana_data(client: Client, request: Request){
    const service = new MyService(client)
    const res = await service.GetKibanaData(request.query["order_uuid"].toLowerCase());
    return res;
}

export async function get_could_watch_data(client: Client, request: Request){
    const service = new MyService(client);
    const res = await service.GetCloudWatchData(request.body["ActionsData"], request.body["Levels"]);
    return res;
}