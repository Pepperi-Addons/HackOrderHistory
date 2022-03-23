import { Observable } from 'rxjs';
import jwt from 'jwt-decode';
import { PapiClient } from '@pepperi-addons/papi-sdk';
import { Injectable } from '@angular/core';

import { PepAddonService, PepHttpService, PepSessionService } from '@pepperi-addons/ngx-lib';
import { config } from '../app.config';


@Injectable({ providedIn: 'root' })
export class AddonService {
    addonURL = '';
    accessToken = '';
    parsedToken: any
    papiBaseURL = ''
    addonUUID;
    serverBaseURL = ''
    
    get papiClient(): PapiClient {
        return new PapiClient({
            baseURL: this.papiBaseURL,
            token: this.sessionService.getIdpToken(),
            addonUUID: this.addonUUID,
            suppressLogging:true
        })
    }

    constructor(
        private sessionService:  PepSessionService,
        private httpService: PepHttpService,
        private addonService: PepAddonService
    ) {
        this.addonUUID = config.AddonUUID;
        this.addonURL = `/addons/files/${this.addonUUID}`;
        this.accessToken = this.sessionService.getIdpToken();
        this.parsedToken = jwt(this.accessToken);
        this.papiBaseURL = this.parsedToken["pepperi.baseurl"];
        this.serverBaseURL = this.addonService.getServerBaseUrl(this.addonUUID, 'api');
    }

    // Get the header data.
    getHeaderData(orderNumber: string): Observable<boolean> {
        return this.httpService.getHttpCall(`${this.serverBaseURL}/get_header_data_from_sql?order_id=${orderNumber}`);
    }

    // Get the sql data.
    getSqlData(orderNumber: string): Observable<boolean> {
        return this.httpService.getHttpCall(`${this.serverBaseURL}/get_sql_data?order_id=${orderNumber}`);
    }

    // Get the kibana data.
    getKibanaData(orderUUID: string): Observable<boolean> {
        return this.httpService.getHttpCall(`${this.serverBaseURL}/get_kibana_data?order_uuid=${orderUUID}`);
    }

    // Get the cloud data.
    getCloudData(actionsData: any[], levels: string): Observable<boolean> {
        const body = {
            ActionsData: actionsData,
            Levels: levels,
        };

        return this.httpService.postHttpCall(`${this.serverBaseURL}/get_could_watch_data`, body);
    }
}
