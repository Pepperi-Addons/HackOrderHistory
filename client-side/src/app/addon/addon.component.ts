import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from "@angular/core";
import { PepLayoutService, PepScreenSizeType, UIControl } from '@pepperi-addons/ngx-lib';
import { TranslateService } from '@ngx-translate/core';

import { AddonService } from "../services/addon.service";
import { IPepGenericListDataSource, IPepGenericListActions } from "@pepperi-addons/ngx-composite-lib/generic-list";
import { PepSelectionData } from '@pepperi-addons/ngx-lib/list';
import { ActivatedRoute, Router } from "@angular/router";
import { PepDialogData, PepDialogService } from "@pepperi-addons/ngx-lib/dialog";
import { IPepSearchClickEvent } from "@pepperi-addons/ngx-lib/search";
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
    orderNumber = '282788636';
    hasError = false;
    headerDataLoaded = false;
    tabSqlLoaded = false;
    tabKibanaLoaded = false;
    tabCloudLoaded = false;
    
    headerData: any = null;
    headerUiControl: any = null;

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

    private loadSqlDetails(res) {
        
        // this.tabSqlLoaded = true;
    }
    
    private loadKibanaDetails(res) {
        
        this.tabKibanaLoaded = true;
    }
    
    private loadCloudDetails(res) {
        
        this.tabCloudLoaded = true;
    }

    private initFlags() {
        this.hasError = false;
        this.headerDataLoaded = false;
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
        
        this.addonService.getKibanaData(this.orderNumber).toPromise().then(res => {
            this.loadKibanaDetails(res);
        });
        
        this.addonService.getCloudData(this.orderNumber).toPromise().then(res => {
            this.loadCloudDetails(res);
        });
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

    atdListDataSource: IPepGenericListDataSource = {
        init: async (state) => {
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
                        {
                            FieldID: 'Field1',
                            Type: 'TextBox',
                            Title: 'Field1',
                            Mandatory: false,
                            ReadOnly: true
                        },
                        {
                            FieldID: 'Field2',
                            Type: 'Boolean',
                            Title: 'Field2',
                            Mandatory: false,
                            ReadOnly: true
                        }
                      ],
                      Columns: [
                        {
                          Width: 25
                        },
                        {
                          Width: 25
                        }
                      ],
                      FrozenColumnsCount: 0,
                      MinimumColumnWidth: 0
                    }, items: [{
                        Key: 'key1',
                        Field1: 'Hello',
                        Field2: true
                    },
                    {
                        Key: 'key1',
                        Field1: 'World',
                        Field2: false
                    }], totalCount: 2
                
            }
        }
    }

    orderListDataSource: IPepGenericListDataSource = this.atdListDataSource;
    orderItemsListDataSource: IPepGenericListDataSource = this.atdListDataSource;
    operationsListDataSource: IPepGenericListDataSource = this.atdListDataSource;
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
