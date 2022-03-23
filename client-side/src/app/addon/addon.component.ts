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
// import { headerUiControl, headerData } from './hardcoded-data';

@Component({
    selector: 'addon-module',
    templateUrl: './addon.component.html',
    styleUrls: ['./addon.component.scss']
})
export class AddonComponent implements OnInit {
    @Input() hostObject: any;
    
    @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();
    
    screenSize: PepScreenSizeType;
    expansionPanelHeaderHeight = '*';
    orderNumber = '284220163'; //'282788636';
    hasError = false;
    headerDataLoaded = false;
    tabsLoaded = false;
    tabSqlLoaded = false;
    tabKibanaLoaded = false;
    tabCloudLoaded = false;
    
    headerData: any = null;
    headerUiControl: any = null;

    orderUUID = '';

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

    private loadHeaderDetails(res) {
        const columnsNumber = 3;
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
                FormattedValue: objectKey.indexOf('DateTime') >= 0 ? new Date(objectValue).toLocaleString() : objectValue,
                Visible: "true"
            });

            index++;
        });

        this.headerUiControl = headerUiControl;
        this.headerData = headerData;
        this.headerDataLoaded = true;
    }

    private getBooleanValue(hidden) {
        return hidden === true ? 'True' : 'False';
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
                this.operationsRows = [{
                    OperationType: operationsData['OperationType'],
                    NumOperationTries: operationsData['NumOperationTries'],
                    IsDone: this.getBooleanValue(operationsData['IsDone']),
                }]
            }
        }

        this.tabsLoaded = true;
        this.tabSqlLoaded = true;
    }
    
    private loadKibanaDetails(res) {
        
        this.tabKibanaLoaded = true;
    }
    
    private loadCloudDetails(res) {
        
        this.tabCloudLoaded = true;
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

    private initFlags() {
        this.hasError = false;
        this.headerDataLoaded = false;
        this.tabsLoaded = false;
        this.tabSqlLoaded = false;
        this.tabKibanaLoaded = false;
        this.tabCloudLoaded = false;
    }

    ngOnInit() {
        // this.openFixDialog();
    }

    onSearchChanged(event: IPepSearchClickEvent) {
        this.initFlags();

        // Search history for this order number.
        this.orderNumber = event.value;
        
        this.addonService.getHeaderData(this.orderNumber).toPromise().then(res => {
            this.loadHeaderDetails(res);
        });

        this.addonService.getSqlData(this.orderNumber).toPromise().then(res => {
            this.loadSqlDetails(res);
        });
        
        // this.addonService.getKibanaData(this.orderNumber).toPromise().then(res => {
        //     this.loadKibanaDetails(res);
        // });
        
        // this.addonService.getCloudData(this.orderNumber).toPromise().then(res => {
        //     this.loadCloudDetails(res);
        // });
    }

    openFixDialog() {
        // Show limit error msg.
        const dialogData = new PepDialogData({
            title: 'Info',
            content: 'Nice, now for fixing the problem please call Diogo - 052-44757XX',
            // showHeader: false
        });

        this.dialogService.openDefaultDialog(dialogData);
    }
    
    tabClick(event) {
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

    kibanaListDataSource: IPepGenericListDataSource = this.atdListDataSource;
    cloudListDataSource: IPepGenericListDataSource = this.atdListDataSource;

    // actions: IPepGenericListActions = {
    //     get: async (data: PepSelectionData) => {
    //         if (data.rows.length) {
    //             return [{
    //                 title: this.translate.instant("Edit"),
    //                 handler: async (objs) => {
    //                     this.router.navigate([objs[0].Key], {
    //                         relativeTo: this.route,
    //                         queryParamsHandling: 'merge'
    //                     });
    //                 }
    //             }]
    //         } else return []
    //     }
    // }
}
