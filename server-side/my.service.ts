import { PapiClient, InstalledAddon, TransactionLines, Transaction, ATDMetaData, User, AuditLog } from '@pepperi-addons/papi-sdk'
import { Client } from '@pepperi-addons/debug-server';
import { OrderStatus, OperationType } from './MappingNames'
import peach from 'parallel-each';

class MyService {
    papiClient: PapiClient
    OrderStatus = new OrderStatus();
    OperationType = new OperationType();

    constructor(private client: Client) {
        this.papiClient = new PapiClient({
            baseURL: client.BaseURL,
            token: client.OAuthAccessToken,
            addonUUID: client.AddonUUID,
            addonSecretKey: client.AddonSecretKey,
            actionUUID: client.ActionUUID
        });
    }

    // For page block template
    upsertRelation(relation): Promise<any> {
        return this.papiClient.post('/addons/data/relations', relation);
    }

    async GetSQLData(orderID: number) : Promise<any>{
        let orderData : Transaction = await this.papiClient.transactions.get(orderID);      
        let operationData : Array<any> = await this.papiClient.get('/operations?where=ReceiverID=' + orderID);      
        let orderItemsData : TransactionLines[] = await this.papiClient.transactionLines.iter({where: "Transaction.WrntyID=" + orderID}).toArray();
        //let activityTypeDfinitionData: ATDMetaData = await this.papiClient.get("/meta_data/Transactions/types/" + orderData.ActivityTypeID);

        let result = {
            "Order": this.GetTrasactionResult(orderData),
            "OrderItems": this.GetTrasactionLineResult(orderItemsData),
            "Operation": this.GetOperationResult(operationData),
            //"ATD": this.GetATDResult(activityTypeDfinitionData)
        };
        return result;
    }

    async GetHeaderDataFromSQL(orderID: number) : Promise<any>{
        let orderData : Transaction = await this.papiClient.transactions.get(orderID);      
        let activityTypeDfinitionData: ATDMetaData = await this.papiClient.get("/meta_data/Transactions/types/" + orderData.ActivityTypeID);
        let userID: any = orderData.Agent?.Data?.InternalID;
        let user = await this.papiClient.users.get(userID);
        let orderStatus: any = orderData.Status;

        let result = {
            "CreationDateTime": orderData.CreationDateTime,
            "ModificationDateTime": orderData.ModificationDateTime,
            "ActionDateTime": orderData.ActionDateTime,
            "Status": this.OrderStatus.GetNameStatsusByID(orderStatus.toString()) ? this.OrderStatus.GetNameStatsusByID(orderStatus.toString()) : orderStatus,
            "UserEmail": user.Email,
            "ExternalID": orderData.ExternalID,
            "Hidden": orderData.Hidden + '',
            "CatalogExternalID": orderData.Catalog?.Data?.ExternalID,
            "ATDName": activityTypeDfinitionData.ExternalID,
            "ATDHidden": activityTypeDfinitionData.Hidden + '',
            "ATDCreationDateTime": activityTypeDfinitionData.CreationDateTime,  
            "ATDDescription": activityTypeDfinitionData.Description,
            "ATDModificationDateTime": activityTypeDfinitionData.ModificationDateTime,
        };
        return result;
    }

    async GetKibanaData(orderUUID: string) : Promise<any>{
        let relativeUrl = `/audit_data_logs?where=ObjectKey.keyword=${orderUUID}&order_by=CreationDateTime DESC`;
        let auditLogs : Array<any> = await this.papiClient.get(relativeUrl);      
        let result: Array<any> = [];
        for (let i = 0; i < auditLogs.length; i++){
            let userUUID: any = auditLogs[i].UserUUID;
            let user: User = await this.papiClient.users.uuid(userUUID).get();
            let log = {
                "ActionUUID": auditLogs[i].ActionUUID,
                "UserEmail": user.Email,
                "ActionType": auditLogs[i].ActionType,
                "ObjectModificationDateTime": auditLogs[i].ObjectModificationDateTime,
                "UpdatedFields": auditLogs[i].UpdatedFields
            };
            result.push(log);
        }      
        return result;
    }

    async GetDeviceData(actionsUUIDs: Array<string>){
        let result: Array<any> = [];
        for(let i = 0; i < actionsUUIDs.length; i++){
            let log: AuditLog = await this.papiClient.auditLogs.uuid(actionsUUIDs[i]).get();
            if(log != null && log.AuditInfo != null && log.AuditInfo.ResultObject != null && log.AuditInfo.ResultObject != {} && log.AuditInfo.ResultObject != ""){
                let deviceInfoString: string = log.AuditInfo.ResultObject;
                let deviceInfo = JSON.parse(deviceInfoString);
                if(deviceInfo != null && deviceInfo.ClientInfo != null){
                    result.push({
                        ActionUUID: actionsUUIDs[i],
                        FormattedLastSyncDateTime: deviceInfo.ClientInfo['FormattedLastSyncDateTime'],
                        DeviceExternalID: deviceInfo.ClientInfo['DeviceExternalID'],
                        SoftwareVersion: deviceInfo.ClientInfo['SoftwareVersion'],
                        DeviceModel: deviceInfo.ClientInfo['DeviceModel'],
                        SystemVersion: deviceInfo.ClientInfo['SystemVersion']
                    });          
                }
            }
        }
        return result;
    }

    async GetCloudWatchData(ActionsData: Array<any>, levels: Array<string>) : Promise<any>{
        const groups = ['OperationInvoker', 'PAPI', 'CORE', 'CPAPI'];
        let body = {
            Fields: ['DateTimeStamp','ActionUUID', 'Level', 'Message', 'Exception'],
            PageSize: 1000
        }
        let levelFilter = "";
        if(levels.length > 0){
            levelFilter = `Level = '${levels[0].toUpperCase()}'`;
            for( let i = 1; i < levels.length; i++){
                levelFilter = levelFilter + ` OR Level = '${levels[i].toUpperCase()}'`;
            }
        }
        
        for(let i = 0; i < ActionsData.length; i++){
            body["Filter"] = `(ActionUUID = '${ActionsData[i].ActionUUID}')`;
            if(levelFilter){
                body["Filter"] = body["Filter"] +  ` AND (${levelFilter})`;
            }
            
            let objectModificationDateTime = new Date(ActionsData[i].ObjectModificationDateTime);
            let startDate = new Date(objectModificationDateTime.getTime() - (1000 * (60 * 30)));
            let endDate = new Date(objectModificationDateTime.getTime() + (1000 * (60 * 10)));

            body["DateTimeStamp"] = {"Start": startDate.toISOString(), "End": endDate.toISOString()};
        }
           
        //let result = await this.BuildResultFromCloudWatch(cloudWatchLogs);
        let cloudWatchLogs = await this.GetLogsFromCloudWatchParallel(groups, body);
        cloudWatchLogs.sort((a,b) => (a.DateTimeStamp > b.DateTimeStamp) ? 1 : ((b.DateTimeStamp > a.DateTimeStamp) ? -1 : 0))
        return cloudWatchLogs;
    }

    GetTrasactionResult(orderData: Transaction){
        let orderRes = {
            "Hidden": orderData.Hidden,
            "UUID": orderData.UUID,
            "ActivityTypeID": orderData.ActivityTypeID,
            "Agent": orderData.Agent,
            "Creatior": orderData.Creator
        };
        return orderRes;
    }

    GetTrasactionLineResult(orderItemsData: TransactionLines[]){
        let orderItemsRes = new Array<any>();
        for(let i = 0; i < orderItemsData.length; i++){
            let orderItemRes = {
                "InternalID": orderItemsData[i].InternalID,
                "Item": orderItemsData[i].Item,
                "Hidden": orderItemsData[i].Hidden,
                "CreationDateTime": orderItemsData[i].CreationDateTime,
                "ModificationDateTime": orderItemsData[i].ModificationDateTime,
                "UnitsQuantity": orderItemsData[i].UnitsQuantity,
                "UnitPrice": orderItemsData[i].UnitPrice,
                "UnitDiscountPercentage": orderItemsData[i].UnitDiscountPercentage,
                "UnitPriceAfterDiscount": orderItemsData[i].UnitPriceAfterDiscount
            }
            orderItemsRes.push(orderItemRes);
        }
        return orderItemsRes;
    }

    GetOperationResult(operationsData: Array<any>){
        let operationsRes: Array<any> = [];
        for(let i = 0; i < operationsData.length; i++){
            let operationRes = {
                "OperationType": this.OperationType.GetNameTypeByID(operationsData[i].OperationType.toString()) ? this.OperationType.GetNameTypeByID(operationsData[i].OperationType.toString()) : operationsData[i].OperationType,
                "IsDone": operationsData[i].IsDone,
                "NumOperationTries": operationsData[i].NumOperationTries,
                "CreationDate": operationsData[i].CreationDate,
                "ModificationDate": operationsData[i].ModificationDate,
                "OperationStartDate": operationsData[i].OperationStartDate
            };
            operationsRes.push(operationRes);
        }
        
        return operationsRes;
    }

    GetATDResult(activityTypeDfinitionData: ATDMetaData){
        let activityTypeDfinitionRes = {
            "ExternalID": activityTypeDfinitionData.ExternalID,
            "CreationDateTime": activityTypeDfinitionData.CreationDateTime,
            "ModificationDateTime": activityTypeDfinitionData.ModificationDateTime,
            "Hidden": activityTypeDfinitionData.Hidden,
            "Description": activityTypeDfinitionData.Description
        };
        return activityTypeDfinitionRes;
    }

    async GetLogsFromCloudWatchParallel(groups: Array<string>, body: any){
        const maxParallel = 5;
        let output: Array<any> = [];
        await peach(groups, async (group, index) => {
            body['Groups'] = [group];
            let cloudWatchLogs : Array<any> = await this.papiClient.post('/logs', body);
            output.push(...cloudWatchLogs);
        }, maxParallel)
        return output;
    }

    /*async BuildResultFromCloudWatch(resultFromCloudWatch: Array<any>){
        let result: Array<any> = [];
        for(let i = 0; i < resultFromCloudWatch.length; i++){
            result.push(resultFromCloudWatch[i]);
            if(result[i]['UserID'] != null){               
                if(result[i]['UserEmail'] == null){
                    let userID: any = result[i]['UserID'];
                    let user: User = await this.papiClient.users.get(userID);
                    result[i]['UserEmail'] = user.Email;
                }
                delete result[i].UserID;
            }
            if(result[i]['UserUUID'] != null && result[i]['UserUUID'] != ""){            
                if(result[i]['UserEmail'] == null){
                    let userUUID: any = result[i]['UserUUID'];
                    let user:User = await this.papiClient.users.uuid(userUUID).get();;
                    result[i]['UserEmail'] = user.Email;
                }
                delete result[i].UserUUID;
            }
        }
        return result;
    }*/
}

export default MyService;