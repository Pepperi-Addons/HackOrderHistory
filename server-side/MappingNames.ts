export class OrderStatus {
    Status = {
        0:"Null or Empty Status",
        1:"In Creation",
        2:"Submited",
        3:"In Progress",
        4:"On Hold",
        5:"Cancelled",
        6:"Need Revision",
        7:"Closed",
        8:"Failed",
        9:"Need Approval",
        10:"Need Agent Approval",
        11:"Submitting",
        12:"ERP",
        13:"Bill Of Lading",
        14:"Invoice",
        15:"Need Online Approval Pending approval from external ERP system",
        16:"In Planning",
        17:"Published",
        18:"In Payment",
        19:"Paid",
        20:"Need Payment",
        21:"Split",
        100:"Online Response Success",
        101:"Online Response Failure",
        102:"Online Response Warning",
        200:"Submitted By Client",
        300:"Delete",
        301:"Edit",
        1000:"New"
    };
    GetNameStatsusByID(id: string){
        return this.Status[id]
    }
}

export class OperationType{
    Types = {
        94:"Operation Email",
        95:"Operation Export",
        109:"Operation Definition",
        112:"Operation Online Action",
        127:"Operation Stock Taking",
        132:"Operation Webhook",
        151:"Connect To Buyer Email",
        154:"Reset Password Email"
    };
    GetNameTypeByID(id: string){
        return this.Types[id]
    }
}

