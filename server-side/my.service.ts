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
        let operationData : any = await this.papiClient.get('/operations?where=ReceiverID=' + orderID);      
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
            "ATDName": activityTypeDfinitionData.ExternalID,
            "CatalogExternalID": orderData.Catalog?.Data?.ExternalID
        };
        return result;
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
                "UnitsQuantity": orderItemsData[i].UnitsQuantity,
                "UnitPrice": orderItemsData[i].UnitPrice,
                "UnitDiscountPercentage": orderItemsData[i].UnitDiscountPercentage,
                "UnitPriceAfterDiscount": orderItemsData[i].UnitPriceAfterDiscount
            }
            orderItemsRes.push(orderItemRes);
        }
        return orderItemsRes;
    }

    GetOperationResult(operationData: any){
        let operationRes = {
            "OperationType": this.OperationType.GetNameTypeByID(operationData.OperationType.toString()) ? this.OperationType.GetNameTypeByID(operationData.OperationType.toString()) : operationData.OperationType,
            "IsDone": operationData.IsDone,
            "NumOperationTries": operationData.NumOperationTries
        };
        return operationRes;
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
}

export default MyService;