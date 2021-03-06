import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from "@angular/core";
import { PepLayoutService, PepScreenSizeType, UIControl } from '@pepperi-addons/ngx-lib';
import { TranslateService } from '@ngx-translate/core';

import { AddonService } from "../services/addon.service";
import { IPepGenericListDataSource, IPepGenericListActions } from "@pepperi-addons/ngx-composite-lib/generic-list";
import { PepSelectionData } from '@pepperi-addons/ngx-lib/list';
import { ActivatedRoute, Router } from "@angular/router";
import { PepDialogData, PepDialogService } from "@pepperi-addons/ngx-lib/dialog";
import { IPepSearchClickEvent } from "@pepperi-addons/ngx-lib/search";
import { DataViewFieldType } from "@pepperi-addons/papi-sdk";

@Component({
    selector: 'addon-module',
    templateUrl: './addon.component.html',
    styleUrls: ['./addon.component.scss']
})
export class AddonComponent implements OnInit {
    headerData: any = null;
    headerUiControl: any = null;

    screenSize: PepScreenSizeType;
    expansionPanelHeaderHeight = '*';
    orderNumber = '';
    hasError = false;
    headerDataLoaded = false;
    tabSqlLoaded = false;
    tabKibanaLoaded = false;
    tabCloudLoaded = false;
    tabDeviceDetailsLoaded = false;
    // hasErrorInCloud = false;

    orderUUID = '';
    currentTabIndex = 0;
    allActionsDataMap = new Map<string, string>();

    actionsUuidsOptions = [];
    actionsUuidsCloudValue = '';
    levelsOptions = [{ "key": "Info", "value": "Info" }, { "key": "Error", "value": "Error" }, { "key": "Debug", "value": "Debug" }];
    levelsValue = 'Info;Error;Debug';

    actionsUuidsDeviceDetailsValue = '';
    
    constructor(
        public addonService: AddonService,
        public router: Router,
        public route: ActivatedRoute,
        public layoutService: PepLayoutService,
        public translate: TranslateService,
        public dialogService: PepDialogService,
    ) {
        this.layoutService.onResize$.subscribe(size => {
            this.screenSize = size;
        });
    }

    private initDataForOrderHistory() {
        this.hasError = false;
        this.headerDataLoaded = false;
        this.tabSqlLoaded = false;
        this.tabKibanaLoaded = false;
        this.tabCloudLoaded = false;
        this.tabDeviceDetailsLoaded = false;
        // this.hasErrorInCloud = false;

        this.orderUUID = '';
        this.currentTabIndex = 0;
        this.allActionsDataMap.clear();
        this.actionsUuidsOptions = [];
    }

    private loadHeaderDetails(res) {
        const columnsNumber = 4;
        const headerUiControl = {
            Columns: columnsNumber,
            ControlFields: []
        };
        
        const headerData = {
            Fields: []
        };

        let index = 0;
        Object.keys(res).forEach(objectKey => {
            headerUiControl.ControlFields.push({
                ApiName: objectKey,
                // ColumnWidth: 100 / columnsNumber,
                FieldType: 1,
                Layout: {
                    Height: 1,
                    LineNumber: 0,
                    Width: 1,
                    X: index % columnsNumber,
                    XAlignment: 1,
                    Y: parseInt((index / columnsNumber).toString()),
                    YAlignment: 3
                },
                Title: this.translate.instant(`HEADER_DETAILS.${objectKey}`) + ":"
            });

            const objectValue = res[objectKey];
            headerData.Fields.push({
                ApiName: objectKey,
                FieldType: 1,
                FormattedValue: objectKey.indexOf('DateTime') >= 0 ? this.getDateValue(objectValue) : objectValue,
                Visible: "true"
            });

            index++;
        });

        this.headerUiControl = headerUiControl;
        this.headerData = headerData;
        this.headerDataLoaded = true;
    }

    private getBooleanValue(value) {
        return value === true ? 'True' : 'False';
    }

    private getDateValue(value) {
        return new Date(value).toLocaleString();
    }

    private loadSqlDetails(res) {
        if (res) {
            const atdData = res['ATD'];
    
            if (atdData) {
                this.atdRows = [{
                    Key: 'atd1',
                    ExternalID: atdData['ExternalID'],
                    Description: atdData['Description'],
                    CreationDateTime: atdData['CreationDateTime'],
                    ModificationDateTime: atdData['ModificationDateTime'],
                    Hidden: this.getBooleanValue(atdData['Hidden']),
                }]
            }
            
            const orderData = res['Order'];
            if (orderData) {
                this.orderUUID = orderData['UUID'];

                // After getting the order UUID from the res load data from Kibana.
                this.addonService.getKibanaData(this.orderUUID).toPromise().then(res => {
                    this.loadKibanaDetails(res);
                });

                // this.orderRows = [{
                //     Key: 'order1',
                //     ActivityTypeID: orderData['ActivityTypeID'],
                //     UUID: orderData['UUID'],
                //     Hidden: orderData['Hidden'],
                    
                // }]
            }
            
            const orderItemsData = res['OrderItems'];
            if (orderItemsData) {
                this.orderItemsRows = [];

                for (let index = 0; index < orderItemsData.length; index++) {
                    const orderItem = orderItemsData[index];
                    this.orderItemsRows.push({
                        InternalID: orderItem['InternalID'],
                        ExternalID: orderItem['Item']['Data']['ExternalID'],
                        UnitDiscountPercentage: orderItem['UnitDiscountPercentage'],
                        UnitPrice: orderItem['UnitPrice'],
                        UnitPriceAfterDiscount: orderItem['UnitPriceAfterDiscount'],
                        UnitsQuantity: orderItem['UnitsQuantity'],
                        CreationDateTime: orderItem['CreationDateTime'],
                        ModificationDateTime: orderItem['ModificationDateTime'],
                        Hidden: this.getBooleanValue(orderItem['Hidden']),
                    });
                }
            }

            const operationsData = res['Operation'];
    
            if (operationsData) {
                this.operationsRows = [];

                for (let index = 0; index < operationsData.length; index++) {
                    const operationItem = operationsData[index];
                    this.operationsRows.push({
                        OperationType: operationItem['OperationType'],
                        NumOperationTries: operationItem['NumOperationTries'],
                        IsDone: this.getBooleanValue(operationItem['IsDone']),
                    });
                }
            }
        }

        this.tabSqlLoaded = true;
    }
    
    private loadKibanaDetails(res) {
        if (res) {
            this.kibanaActionsRows = [];

            for (let actionIndex = 0; actionIndex < res.length; actionIndex++) {
                const actionItem = res[actionIndex];
                const updatedFields = actionItem['UpdatedFields'];
                
                if (updatedFields) {
                    for (let index = 0; index < updatedFields.length; index++) {
                        const updatedField = updatedFields[index];
                        
                        this.kibanaActionsRows.push({
                            ActionType: actionItem['ActionType'],
                            ActionUUID: actionItem['ActionUUID'],
                            UserEmail: actionItem['UserEmail'],
                            FieldID: updatedField['FieldID'],
                            OldValue: updatedField['FieldID'].indexOf('DateTime') >= 0 ? this.getDateValue(updatedField['OldValue']) : updatedField['OldValue'],
                            NewValue: updatedField['FieldID'].indexOf('DateTime') >= 0 ? this.getDateValue(updatedField['NewValue']) : updatedField['NewValue'],
                        });
                    }
                }

                // Add data for cloud usage.
                this.allActionsDataMap.set(actionItem['ActionUUID'], actionItem['ObjectModificationDateTime']);
                this.actionsUuidsOptions.push({
                    "key": actionItem['ActionUUID'], "value": actionItem['ActionUUID']
                });
            }
        }

        this.tabKibanaLoaded = true;
    }
    
    private loadCloudDetails(res) {
        if (res) {
            this.cloudRows = [];

            for (let index = 0; index < res.length; index++) {
                const cloudItem = res[index];
                
                this.cloudRows.push({
                    DateTimeStamp: this.getDateValue(cloudItem['DateTimeStamp']),
                    ActionUUID: cloudItem['ActionUUID'],
                    // UserEmail: cloudItem['UserEmail'],
                    Level: cloudItem['Level'],
                    Message: cloudItem['Message'],
                    Exception: cloudItem['Exception'],
                });

                // if (!this.hasErrorInCloud) {
                //     this.hasErrorInCloud = cloudItem['Exception']?.length > 0;
                // }
            }
        }

        this.tabCloudLoaded = true;
    }

    private loadDeviceDetails(res) {
        if (res) {
            this.deviceDetailsRows = [];

            for (let index = 0; index < res.length; index++) {
                const deviceDetailsItem = res[index];
                
                this.deviceDetailsRows.push({
                    ActionUUID: deviceDetailsItem['ActionUUID'],
                    FormattedLastSyncDateTime: this.getDateValue(deviceDetailsItem['FormattedLastSyncDateTime']),
                    DeviceExternalID: deviceDetailsItem['DeviceExternalID'],
                    SoftwareVersion: deviceDetailsItem['SoftwareVersion'],
                    DeviceModel: deviceDetailsItem['DeviceModel'],
                    SystemVersion: deviceDetailsItem['SystemVersion'],
                });
            }
        }

        this.tabDeviceDetailsLoaded = true;
    }

    private getReadOnlyColumn(columnId: string, type: DataViewFieldType): any {
        return {
            FieldID: columnId,
            Type: type,
            Title: columnId,
            Mandatory: false,
            ReadOnly: true
        }
    }

    ngOnInit() {
    }

    onSearchChanged(event: IPepSearchClickEvent) {
        this.initDataForOrderHistory();

        // Search history for this order number.
        this.orderNumber = event.value;
        
        if (this.orderNumber.length > 0) {
            this.addonService.getHeaderData(this.orderNumber).toPromise().then(res => {
                this.loadHeaderDetails(res);
            });
    
            this.addonService.getSqlData(this.orderNumber).toPromise().then(res => {
                this.loadSqlDetails(res);
            });
        }
    }

    onActionsUuidsCloudChanged(keys: string) {
        this.actionsUuidsCloudValue = keys;
    }

    onLevelsValueChanged(keys: string) {
        this.levelsValue = keys;
    }

    onLoadCloudDataClicked(event) {
        if (this.actionsUuidsCloudValue.length > 0) {
            this.tabCloudLoaded = false;
            const actionsUuidsArr = this.actionsUuidsCloudValue.split(';');

            // Prepare the data
            const actionsData = actionsUuidsArr.map(actionUuid => {
                return {
                    ActionUUID: actionUuid,
                    ObjectModificationDateTime: this.allActionsDataMap.get(actionUuid)
                }
            });

            this.addonService.getCloudData(actionsData, this.levelsValue.split(';')).toPromise().then(res => {
                this.loadCloudDetails(res);
            });
        } else {
            // Show Info msg.
            const dialogData = new PepDialogData({
                title: 'Info',
                content: 'Please select at least one action UUID',
            });

            this.dialogService.openDefaultDialog(dialogData);
        }
    }
    
    onActionsUuidsDeviceDetailsChanged(keys: string) {
        this.actionsUuidsDeviceDetailsValue = keys;
    }

    onLoadDeviceDetailsDataClicked(event) {
        if (this.actionsUuidsDeviceDetailsValue.length > 0) {
            this.tabDeviceDetailsLoaded = false;

            this.addonService.getDeviceDetailsData(this.actionsUuidsDeviceDetailsValue).toPromise().then(res => {
                this.loadDeviceDetails(res);
            });
        } else {
            // Show Info msg.
            const dialogData = new PepDialogData({
                title: 'Info',
                content: 'Please select at least one action UUID',
            });

            this.dialogService.openDefaultDialog(dialogData);
        }
    }

    // openFixDialog() {
    //     // Show limit error msg.
    //     const dialogData = new PepDialogData({
    //         title: 'Just kidding',
    //         content: '<p>If you really want to fix the problems<br/><span class="bold title-lg">call Diogo - 052-44757XX<span><p>',
    //         // showHeader: false
    //     });

    //     this.dialogService.openDefaultDialog(dialogData);
    // }
    
    tabClick(event) {
        this.currentTabIndex = event.index;
        // Implement: Tab navigate function
    }

    atdRows: any[];
    atdListDataSource: IPepGenericListDataSource = {
        init: async () => {
            return {
                dataView: {
                    Context: {
                        Name: '',
                        Profile: { InternalID: 0 },
                        ScreenSize: 'Landscape'
                    },
                    Type: 'Grid',
                    Title: '',
                    Fields: [
                        this.getReadOnlyColumn('ExternalID', 'TextBox'),
                        this.getReadOnlyColumn('Description', 'TextBox'),
                        this.getReadOnlyColumn('CreationDateTime', 'DateAndTime'),
                        this.getReadOnlyColumn('ModificationDateTime', 'DateAndTime'),
                        this.getReadOnlyColumn('Hidden', 'TextBox'),
                    ],
                    Columns: [
                        { Width: 15 },
                        { Width: 30 },
                        { Width: 15 },
                        { Width: 20 },
                        { Width: 20 }  
                    ],
                    FrozenColumnsCount: 0,
                    MinimumColumnWidth: 0
                }, 
                items: this.atdRows,
                totalCount: this.atdRows.length
            }
        }
    }

    // orderRows: any[];
    // orderListDataSource: IPepGenericListDataSource = {
    //     init: async () => {
    //         return {
    //             dataView: {
    //                 Context: {
    //                     Name: '',
    //                     Profile: { InternalID: 0 },
    //                     ScreenSize: 'Landscape'
    //                 },
    //                 Type: 'Grid',
    //                 Title: '',
    //                 Fields: [
    //                     this.getReadOnlyColumn('ActivityTypeID', 'TextBox'),
    //                     this.getReadOnlyColumn('Description', 'TextBox'),
    //                     this.getReadOnlyColumn('ExternalID', 'TextBox'),
    //                     this.getReadOnlyColumn('Hidden', 'Boolean'),
    //                     this.getReadOnlyColumn('ModificationDateTime', 'DateAndTime'),
    //                 ],
    //                 Columns: [
    //                     { Width: 15 },
    //                     { Width: 30 },
    //                     { Width: 15 },
    //                     { Width: 20 },
    //                     { Width: 20 }  
    //                 ],
    //                 FrozenColumnsCount: 0,
    //                 MinimumColumnWidth: 0
    //             }, 
    //             items: this.orderRows,
    //             totalCount: this.orderRows.length
    //         }
    //     }
    // }
    
    orderItemsRows: any[];
    orderItemsListDataSource: IPepGenericListDataSource = {
        init: async () => {
            return {
                dataView: {
                    Context: {
                        Name: '',
                        Profile: { InternalID: 0 },
                        ScreenSize: 'Landscape'
                    },
                    Type: 'Grid',
                    Title: '',
                    Fields: [
                        this.getReadOnlyColumn('InternalID', 'TextBox'),
                        this.getReadOnlyColumn('ExternalID', 'TextBox'),
                        this.getReadOnlyColumn('UnitDiscountPercentage', 'TextBox'),
                        this.getReadOnlyColumn('UnitPrice', 'TextBox'),
                        this.getReadOnlyColumn('UnitPriceAfterDiscount', 'TextBox'),
                        this.getReadOnlyColumn('UnitsQuantity', 'TextBox'),
                        this.getReadOnlyColumn('CreationDateTime', 'DateAndTime'),
                        this.getReadOnlyColumn('ModificationDateTime', 'DateAndTime'),
                        this.getReadOnlyColumn('Hidden', 'TextBox'),
                    ],
                    Columns: [
                        { Width: 10 },
                        { Width: 20 },
                        { Width: 7.5 },
                        { Width: 7.5 },
                        { Width: 10 },
                        { Width: 10 },
                        { Width: 10 },
                        { Width: 10 },
                        { Width: 10 }  
                    ],
                    FrozenColumnsCount: 0,
                    MinimumColumnWidth: 0
                }, 
                items: this.orderItemsRows,
                totalCount: this.orderItemsRows.length
            }
        }
    }

    operationsRows: any[];
    operationsListDataSource: IPepGenericListDataSource = {
        init: async () => {
            return {
                dataView: {
                    Context: {
                        Name: '',
                        Profile: { InternalID: 0 },
                        ScreenSize: 'Landscape'
                    },
                    Type: 'Grid',
                    Title: '',
                    Fields: [
                        this.getReadOnlyColumn('OperationType', 'TextBox'),
                        this.getReadOnlyColumn('NumOperationTries', 'TextBox'),
                        this.getReadOnlyColumn('IsDone', 'TextBox'),
                    ],
                    Columns: [
                        { Width: 40 },
                        { Width: 40 },
                        { Width: 20 }  
                    ],
                    FrozenColumnsCount: 0,
                    MinimumColumnWidth: 0
                }, 
                items: this.operationsRows,
                totalCount: this.operationsRows.length
            }
        }
    }

    kibanaActionsRows: any[];
    kibanaListDataSource: IPepGenericListDataSource = {
        init: async () => {
            return {
                dataView: {
                    Context: {
                        Name: '',
                        Profile: { InternalID: 0 },
                        ScreenSize: 'Landscape'
                    },
                    Type: 'Grid',
                    Title: '',
                    Fields: [
                        this.getReadOnlyColumn('ActionType', 'TextBox'),
                        this.getReadOnlyColumn('ActionUUID', 'TextBox'),
                        this.getReadOnlyColumn('UserEmail', 'TextBox'),
                        this.getReadOnlyColumn('FieldID', 'TextBox'),
                        this.getReadOnlyColumn('OldValue', 'TextBox'),
                        this.getReadOnlyColumn('NewValue', 'TextBox'),
                    ],
                    Columns: [
                        { Width: 10 },
                        { Width: 25 },
                        { Width: 15 },
                        { Width: 10 },
                        { Width: 20 },
                        { Width: 20 }  
                    ],
                    FrozenColumnsCount: 0,
                    MinimumColumnWidth: 0
                }, 
                items: this.kibanaActionsRows,
                totalCount: this.kibanaActionsRows.length
            }
        }
    }
    
    cloudRows: any[];
    cloudListDataSource: IPepGenericListDataSource = {
        init: async () => {
            return {
                dataView: {
                    Context: {
                        Name: '',
                        Profile: { InternalID: 0 },
                        ScreenSize: 'Landscape'
                    },
                    Type: 'Grid',
                    Title: '',
                    Fields: [
                        this.getReadOnlyColumn('DateTimeStamp', 'TextBox'),
                        this.getReadOnlyColumn('ActionUUID', 'TextBox'),
                        // this.getReadOnlyColumn('UserEmail', 'TextBox'),
                        this.getReadOnlyColumn('Level', 'TextBox'),
                        this.getReadOnlyColumn('Message', 'TextBox'),
                        this.getReadOnlyColumn('Exception', 'TextBox'),
                    ],
                    Columns: [
                        { Width: 15 },
                        { Width: 25 },
                        // { Width: 15 },
                        { Width: 5 },
                        { Width: 40 },
                        { Width: 15 }  
                    ],
                    FrozenColumnsCount: 0,
                    MinimumColumnWidth: 0
                }, 
                items: this.cloudRows,
                totalCount: this.cloudRows.length
            }
        }
    }
    
    deviceDetailsRows: any[];
    deviceDetailsListDataSource: IPepGenericListDataSource = {
        init: async () => {
            return {
                dataView: {
                    Context: {
                        Name: '',
                        Profile: { InternalID: 0 },
                        ScreenSize: 'Landscape'
                    },
                    Type: 'Grid',
                    Title: '',
                    Fields: [
                        this.getReadOnlyColumn('ActionUUID', 'TextBox'),
                        this.getReadOnlyColumn('FormattedLastSyncDateTime', 'TextBox'),
                        this.getReadOnlyColumn('DeviceExternalID', 'TextBox'),
                        this.getReadOnlyColumn('SoftwareVersion', 'TextBox'),
                        this.getReadOnlyColumn('DeviceModel', 'TextBox'),
                        this.getReadOnlyColumn('SystemVersion', 'TextBox'),
                    ],
                    Columns: [
                        { Width: 20 },
                        { Width: 20 },
                        { Width: 15 },
                        { Width: 15 },
                        { Width: 15 },
                        { Width: 15 }  
                    ],
                    FrozenColumnsCount: 0,
                    MinimumColumnWidth: 0
                }, 
                items: this.deviceDetailsRows,
                totalCount: this.deviceDetailsRows.length
            }
        }
    }
}
