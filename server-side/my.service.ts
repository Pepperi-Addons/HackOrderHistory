import { PapiClient, InstalledAddon, TransactionLines, Transaction, ATDMetaData } from '@pepperi-addons/papi-sdk'
import { Client } from '@pepperi-addons/debug-server';
import { OrderStatus, OperationType } from './MappingNames'

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
            actionUUID: client.AddonUUID
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
        let activityTypeDfinitionData: ATDMetaData = await this.papiClient.get("/meta_data/Transactions/types/" + orderData.ActivityTypeID);

        let result = {
            "Order": this.GetTrasactionResult(orderData),
            "OrderItems": this.GetTrasactionLineResult(orderItemsData),
            "Operation": this.GetOperationResult(operationData),
            "ATD": this.GetATDResult(activityTypeDfinitionData)
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
            "Hidden": orderData.Hidden,
            "ATDName": activityTypeDfinitionData.ExternalID,
            "CatalogExternalID": orderData.Catalog?.Data?.ExternalID
        };
        return result;
    }

    async GetKibanaData(orderUUID: string) : Promise<any>{
        let relativeUrl = `/addons/api/00000000-0000-0000-0000-00000da1a109/api/audit_data_logs?where=ObjectKey.keyword=${orderUUID}&order_by=CreationDateTime DESC`;
        let auditLogs : Array<any> = await this.papiClient.get(relativeUrl);      
        let result: Array<any> = [];
        for (let i = 0; i < auditLogs.length; i++){
            let log = {
                "ActionUUID": auditLogs[i].ActionUUID,
                "ActionType": auditLogs[i].ActionType,
                "ObjectModificationDateTime": auditLogs[i].ObjectModificationDateTime,
                "UpdatedFields": auditLogs[i].UpdatedFields
            };
            result.push(log);
        }      
        return result;
    }

    async GetCloudWatchData(ActionsData: Array<any>, levels: Array<string>) : Promise<any>{
        let body = {
            Groups: ['OperationInvoker', 'PAPI', 'CORE', 'CPAPI'],
            Fields: ['ActionUUID', 'Level', 'Message', 'Exception', 'UserID', 'UserEmail', 'UserUUID'],
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
            let endDate = new Date(objectModificationDateTime.getTime() + (1000 * (60 * 15)));

            body["DateTimeStamp"] = {"Start": startDate.toISOString(), "End": endDate.toISOString()};
        }
        let cloudWatchLogs : Array<any> = await this.papiClient.post('/logs', body);        
        return this.BuildResultFromCloudWatch(cloudWatchLogs);
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

    BuildResultFromCloudWatch(resultFromCloudWatch: Array<any>){
        let result: Array<any> = [];
        for(let i = 0; i < resultFromCloudWatch.length; i++){
            result.push(resultFromCloudWatch);
            if(result[i]['UserUUID'] != null && result[i]['UserUUID'] != ""){
                if(result[i]['UserEmail'] == null){
                    result[i]['UserEmail'] = "nofartest";
                }
                delete result[i].UserUUID;
            }
        }
        return result;
    }
}

export default MyService;