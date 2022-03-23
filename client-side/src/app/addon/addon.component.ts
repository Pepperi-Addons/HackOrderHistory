import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from "@angular/core";
import { PepLayoutService, PepScreenSizeType } from '@pepperi-addons/ngx-lib';
import { TranslateService } from '@ngx-translate/core';

import { AddonService } from "../services/addon.service";
import { IPepGenericListDataSource, IPepGenericListActions } from "@pepperi-addons/ngx-composite-lib/generic-list";
import { PepSelectionData } from '@pepperi-addons/ngx-lib/list';
import { ActivatedRoute, Router } from "@angular/router";
import { PepDialogData, PepDialogService } from "@pepperi-addons/ngx-lib/dialog";
import { IPepSearchClickEvent } from "@pepperi-addons/ngx-lib/search";

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
    orderNumber = '';
    hasError = false;

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

    ngOnInit() {
        // this.openFixDialog();
    }

    onSearchChanged(event: IPepSearchClickEvent) {
        this.hasError = false;
        this.orderNumber = event.value;
        
        // TODO: Search history for this order number.
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
