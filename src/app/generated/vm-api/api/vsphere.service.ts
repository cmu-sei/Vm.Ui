/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved. 
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

/**
 * Player VM API
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * OpenAPI spec version: v1
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */
/* tslint:disable:no-unused-variable member-ordering */

import { Inject, Injectable, Optional }                      from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams,
         HttpResponse, HttpEvent }                           from '@angular/common/http';
import { CustomHttpUrlEncodingCodec }                        from '../encoder';

import { Observable }                                        from 'rxjs';

import { ChangeVsphereVirtualMachineNetwork } from '../model/changeVsphereVirtualMachineNetwork';
import { IsoResult } from '../model/isoResult';
import { MountVsphereIso } from '../model/mountVsphereIso';
import { ProblemDetails } from '../model/problemDetails';
import { SetVsphereVirtualMachineResolution } from '../model/setVsphereVirtualMachineResolution';
import { ValidateVsphereVirtualMachineCredentials } from '../model/validateVsphereVirtualMachineCredentials';
import { VirtualMachineToolsStatus } from '../model/virtualMachineToolsStatus';
import { VsphereVirtualMachine } from '../model/vsphereVirtualMachine';

import { BASE_PATH, COLLECTION_FORMATS }                     from '../variables';
import { Configuration }                                     from '../configuration';


@Injectable({
  providedIn: 'root'
})
export class VsphereService {

    protected basePath = 'http://localhost';
    public defaultHeaders = new HttpHeaders();
    public configuration = new Configuration();

    constructor(protected httpClient: HttpClient, @Optional()@Inject(BASE_PATH) basePath: string, @Optional() configuration: Configuration) {

        if (configuration) {
            this.configuration = configuration;
            this.configuration.basePath = configuration.basePath || basePath || this.basePath;

        } else {
            this.configuration.basePath = basePath || this.basePath;
        }
    }

    /**
     * @param consumes string[] mime-types
     * @return true: consumes contains 'multipart/form-data', false: otherwise
     */
    private canConsumeForm(consumes: string[]): boolean {
        const form = 'multipart/form-data';
        for (const consume of consumes) {
            if (form === consume) {
                return true;
            }
        }
        return false;
    }


    /**
     * Change the network of a vsphere virtual machine&#39;s network adapter
     * 
     * @param id 
     * @param ChangeVsphereVirtualMachineNetwork 
     * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
     * @param reportProgress flag to report request and response progress.
     */
    public changeVsphereVirtualMachineNetwork(id: string, ChangeVsphereVirtualMachineNetwork?: ChangeVsphereVirtualMachineNetwork, observe?: 'body', reportProgress?: boolean): Observable<VsphereVirtualMachine>;
    public changeVsphereVirtualMachineNetwork(id: string, ChangeVsphereVirtualMachineNetwork?: ChangeVsphereVirtualMachineNetwork, observe?: 'response', reportProgress?: boolean): Observable<HttpResponse<VsphereVirtualMachine>>;
    public changeVsphereVirtualMachineNetwork(id: string, ChangeVsphereVirtualMachineNetwork?: ChangeVsphereVirtualMachineNetwork, observe?: 'events', reportProgress?: boolean): Observable<HttpEvent<VsphereVirtualMachine>>;
    public changeVsphereVirtualMachineNetwork(id: string, ChangeVsphereVirtualMachineNetwork?: ChangeVsphereVirtualMachineNetwork, observe: any = 'body', reportProgress: boolean = false ): Observable<any> {
        if (id === null || id === undefined) {
            throw new Error('Required parameter id was null or undefined when calling changeVsphereVirtualMachineNetwork.');
        }

        let headers = this.defaultHeaders;

        // authentication (oauth2) required
        if (this.configuration.accessToken) {
            const accessToken = typeof this.configuration.accessToken === 'function'
                ? this.configuration.accessToken()
                : this.configuration.accessToken;
            headers = headers.set('Authorization', 'Bearer ' + accessToken);
        }

        // to determine the Accept header
        let httpHeaderAccepts: string[] = [
            'text/plain',
            'application/json',
            'text/json'
        ];
        const httpHeaderAcceptSelected: string | undefined = this.configuration.selectHeaderAccept(httpHeaderAccepts);
        if (httpHeaderAcceptSelected !== undefined) {
            headers = headers.set('Accept', httpHeaderAcceptSelected);
        }

        // to determine the Content-Type header
        const consumes: string[] = [
            'application/json',
            'text/json',
            'application/_*+json'
        ];
        const httpContentTypeSelected: string | undefined = this.configuration.selectHeaderContentType(consumes);
        if (httpContentTypeSelected !== undefined) {
            headers = headers.set('Content-Type', httpContentTypeSelected);
        }

        return this.httpClient.post<VsphereVirtualMachine>(`${this.configuration.basePath}/api/vms/vsphere/${encodeURIComponent(String(id))}/actions/change-network`,
            ChangeVsphereVirtualMachineNetwork,
            {
                withCredentials: this.configuration.withCredentials,
                headers: headers,
                observe: observe,
                reportProgress: reportProgress
            }
        );
    }

    /**
     * Retrieve a single vsphere virtual machine by Id, including a ticket to access it&#39;s console
     * 
     * @param id 
     * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
     * @param reportProgress flag to report request and response progress.
     */
    public getVsphereVirtualMachine(id: string, observe?: 'body', reportProgress?: boolean): Observable<VsphereVirtualMachine>;
    public getVsphereVirtualMachine(id: string, observe?: 'response', reportProgress?: boolean): Observable<HttpResponse<VsphereVirtualMachine>>;
    public getVsphereVirtualMachine(id: string, observe?: 'events', reportProgress?: boolean): Observable<HttpEvent<VsphereVirtualMachine>>;
    public getVsphereVirtualMachine(id: string, observe: any = 'body', reportProgress: boolean = false ): Observable<any> {
        if (id === null || id === undefined) {
            throw new Error('Required parameter id was null or undefined when calling getVsphereVirtualMachine.');
        }

        let headers = this.defaultHeaders;

        // authentication (oauth2) required
        if (this.configuration.accessToken) {
            const accessToken = typeof this.configuration.accessToken === 'function'
                ? this.configuration.accessToken()
                : this.configuration.accessToken;
            headers = headers.set('Authorization', 'Bearer ' + accessToken);
        }

        // to determine the Accept header
        let httpHeaderAccepts: string[] = [
            'text/plain',
            'application/json',
            'text/json'
        ];
        const httpHeaderAcceptSelected: string | undefined = this.configuration.selectHeaderAccept(httpHeaderAccepts);
        if (httpHeaderAcceptSelected !== undefined) {
            headers = headers.set('Accept', httpHeaderAcceptSelected);
        }

        // to determine the Content-Type header
        const consumes: string[] = [
        ];

        return this.httpClient.get<VsphereVirtualMachine>(`${this.configuration.basePath}/api/vms/vsphere/${encodeURIComponent(String(id))}`,
            {
                withCredentials: this.configuration.withCredentials,
                headers: headers,
                observe: observe,
                reportProgress: reportProgress
            }
        );
    }

    /**
     * Get isos available to be mounted to a vsphere virtual machine
     * 
     * @param id 
     * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
     * @param reportProgress flag to report request and response progress.
     */
    public getVsphereVirtualMachineIsos(id: string, observe?: 'body', reportProgress?: boolean): Observable<Array<IsoResult>>;
    public getVsphereVirtualMachineIsos(id: string, observe?: 'response', reportProgress?: boolean): Observable<HttpResponse<Array<IsoResult>>>;
    public getVsphereVirtualMachineIsos(id: string, observe?: 'events', reportProgress?: boolean): Observable<HttpEvent<Array<IsoResult>>>;
    public getVsphereVirtualMachineIsos(id: string, observe: any = 'body', reportProgress: boolean = false ): Observable<any> {
        if (id === null || id === undefined) {
            throw new Error('Required parameter id was null or undefined when calling getVsphereVirtualMachineIsos.');
        }

        let headers = this.defaultHeaders;

        // authentication (oauth2) required
        if (this.configuration.accessToken) {
            const accessToken = typeof this.configuration.accessToken === 'function'
                ? this.configuration.accessToken()
                : this.configuration.accessToken;
            headers = headers.set('Authorization', 'Bearer ' + accessToken);
        }

        // to determine the Accept header
        let httpHeaderAccepts: string[] = [
            'text/plain',
            'application/json',
            'text/json'
        ];
        const httpHeaderAcceptSelected: string | undefined = this.configuration.selectHeaderAccept(httpHeaderAccepts);
        if (httpHeaderAcceptSelected !== undefined) {
            headers = headers.set('Accept', httpHeaderAcceptSelected);
        }

        // to determine the Content-Type header
        const consumes: string[] = [
        ];

        return this.httpClient.get<Array<IsoResult>>(`${this.configuration.basePath}/api/vms/vsphere/${encodeURIComponent(String(id))}/isos`,
            {
                withCredentials: this.configuration.withCredentials,
                headers: headers,
                observe: observe,
                reportProgress: reportProgress
            }
        );
    }

    /**
     * Get tools status of a vsphere virtual machine
     * 
     * @param id 
     * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
     * @param reportProgress flag to report request and response progress.
     */
    public getVsphereVirtualMachineToolsStatus(id: string, observe?: 'body', reportProgress?: boolean): Observable<VirtualMachineToolsStatus>;
    public getVsphereVirtualMachineToolsStatus(id: string, observe?: 'response', reportProgress?: boolean): Observable<HttpResponse<VirtualMachineToolsStatus>>;
    public getVsphereVirtualMachineToolsStatus(id: string, observe?: 'events', reportProgress?: boolean): Observable<HttpEvent<VirtualMachineToolsStatus>>;
    public getVsphereVirtualMachineToolsStatus(id: string, observe: any = 'body', reportProgress: boolean = false ): Observable<any> {
        if (id === null || id === undefined) {
            throw new Error('Required parameter id was null or undefined when calling getVsphereVirtualMachineToolsStatus.');
        }

        let headers = this.defaultHeaders;

        // authentication (oauth2) required
        if (this.configuration.accessToken) {
            const accessToken = typeof this.configuration.accessToken === 'function'
                ? this.configuration.accessToken()
                : this.configuration.accessToken;
            headers = headers.set('Authorization', 'Bearer ' + accessToken);
        }

        // to determine the Accept header
        let httpHeaderAccepts: string[] = [
            'text/plain',
            'application/json',
            'text/json'
        ];
        const httpHeaderAcceptSelected: string | undefined = this.configuration.selectHeaderAccept(httpHeaderAccepts);
        if (httpHeaderAcceptSelected !== undefined) {
            headers = headers.set('Accept', httpHeaderAcceptSelected);
        }

        // to determine the Content-Type header
        const consumes: string[] = [
        ];

        return this.httpClient.get<VirtualMachineToolsStatus>(`${this.configuration.basePath}/api/vms/vsphere/${encodeURIComponent(String(id))}/tools`,
            {
                withCredentials: this.configuration.withCredentials,
                headers: headers,
                observe: observe,
                reportProgress: reportProgress
            }
        );
    }

    /**
     * Mount an iso to a vsphere virtual machine
     * 
     * @param id 
     * @param MountVsphereIso 
     * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
     * @param reportProgress flag to report request and response progress.
     */
    public mountVsphereVirtualMachineIso(id: string, MountVsphereIso?: MountVsphereIso, observe?: 'body', reportProgress?: boolean): Observable<VsphereVirtualMachine>;
    public mountVsphereVirtualMachineIso(id: string, MountVsphereIso?: MountVsphereIso, observe?: 'response', reportProgress?: boolean): Observable<HttpResponse<VsphereVirtualMachine>>;
    public mountVsphereVirtualMachineIso(id: string, MountVsphereIso?: MountVsphereIso, observe?: 'events', reportProgress?: boolean): Observable<HttpEvent<VsphereVirtualMachine>>;
    public mountVsphereVirtualMachineIso(id: string, MountVsphereIso?: MountVsphereIso, observe: any = 'body', reportProgress: boolean = false ): Observable<any> {
        if (id === null || id === undefined) {
            throw new Error('Required parameter id was null or undefined when calling mountVsphereVirtualMachineIso.');
        }

        let headers = this.defaultHeaders;

        // authentication (oauth2) required
        if (this.configuration.accessToken) {
            const accessToken = typeof this.configuration.accessToken === 'function'
                ? this.configuration.accessToken()
                : this.configuration.accessToken;
            headers = headers.set('Authorization', 'Bearer ' + accessToken);
        }

        // to determine the Accept header
        let httpHeaderAccepts: string[] = [
            'text/plain',
            'application/json',
            'text/json'
        ];
        const httpHeaderAcceptSelected: string | undefined = this.configuration.selectHeaderAccept(httpHeaderAccepts);
        if (httpHeaderAcceptSelected !== undefined) {
            headers = headers.set('Accept', httpHeaderAcceptSelected);
        }

        // to determine the Content-Type header
        const consumes: string[] = [
            'application/json',
            'text/json',
            'application/_*+json'
        ];
        const httpContentTypeSelected: string | undefined = this.configuration.selectHeaderContentType(consumes);
        if (httpContentTypeSelected !== undefined) {
            headers = headers.set('Content-Type', httpContentTypeSelected);
        }

        return this.httpClient.post<VsphereVirtualMachine>(`${this.configuration.basePath}/api/vms/vsphere/${encodeURIComponent(String(id))}/actions/mount-iso`,
            MountVsphereIso,
            {
                withCredentials: this.configuration.withCredentials,
                headers: headers,
                observe: observe,
                reportProgress: reportProgress
            }
        );
    }

    /**
     * Power off a vsphere virtual machine
     * 
     * @param id 
     * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
     * @param reportProgress flag to report request and response progress.
     */
    public powerOffVsphereVirtualMachine(id: string, observe?: 'body', reportProgress?: boolean): Observable<string>;
    public powerOffVsphereVirtualMachine(id: string, observe?: 'response', reportProgress?: boolean): Observable<HttpResponse<string>>;
    public powerOffVsphereVirtualMachine(id: string, observe?: 'events', reportProgress?: boolean): Observable<HttpEvent<string>>;
    public powerOffVsphereVirtualMachine(id: string, observe: any = 'body', reportProgress: boolean = false ): Observable<any> {
        if (id === null || id === undefined) {
            throw new Error('Required parameter id was null or undefined when calling powerOffVsphereVirtualMachine.');
        }

        let headers = this.defaultHeaders;

        // authentication (oauth2) required
        if (this.configuration.accessToken) {
            const accessToken = typeof this.configuration.accessToken === 'function'
                ? this.configuration.accessToken()
                : this.configuration.accessToken;
            headers = headers.set('Authorization', 'Bearer ' + accessToken);
        }

        // to determine the Accept header
        let httpHeaderAccepts: string[] = [
            'text/plain',
            'application/json',
            'text/json'
        ];
        const httpHeaderAcceptSelected: string | undefined = this.configuration.selectHeaderAccept(httpHeaderAccepts);
        if (httpHeaderAcceptSelected !== undefined) {
            headers = headers.set('Accept', httpHeaderAcceptSelected);
        }

        // to determine the Content-Type header
        const consumes: string[] = [
        ];

        return this.httpClient.post<string>(`${this.configuration.basePath}/api/vms/vsphere/${encodeURIComponent(String(id))}/actions/power-off`,
            null,
            {
                withCredentials: this.configuration.withCredentials,
                headers: headers,
                observe: observe,
                reportProgress: reportProgress
            }
        );
    }

    /**
     * Power on a vsphere virtual machine
     * 
     * @param id 
     * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
     * @param reportProgress flag to report request and response progress.
     */
    public powerOnVsphereVirtualMachine(id: string, observe?: 'body', reportProgress?: boolean): Observable<string>;
    public powerOnVsphereVirtualMachine(id: string, observe?: 'response', reportProgress?: boolean): Observable<HttpResponse<string>>;
    public powerOnVsphereVirtualMachine(id: string, observe?: 'events', reportProgress?: boolean): Observable<HttpEvent<string>>;
    public powerOnVsphereVirtualMachine(id: string, observe: any = 'body', reportProgress: boolean = false ): Observable<any> {
        if (id === null || id === undefined) {
            throw new Error('Required parameter id was null or undefined when calling powerOnVsphereVirtualMachine.');
        }

        let headers = this.defaultHeaders;

        // authentication (oauth2) required
        if (this.configuration.accessToken) {
            const accessToken = typeof this.configuration.accessToken === 'function'
                ? this.configuration.accessToken()
                : this.configuration.accessToken;
            headers = headers.set('Authorization', 'Bearer ' + accessToken);
        }

        // to determine the Accept header
        let httpHeaderAccepts: string[] = [
            'text/plain',
            'application/json',
            'text/json'
        ];
        const httpHeaderAcceptSelected: string | undefined = this.configuration.selectHeaderAccept(httpHeaderAccepts);
        if (httpHeaderAcceptSelected !== undefined) {
            headers = headers.set('Accept', httpHeaderAcceptSelected);
        }

        // to determine the Content-Type header
        const consumes: string[] = [
        ];

        return this.httpClient.post<string>(`${this.configuration.basePath}/api/vms/vsphere/${encodeURIComponent(String(id))}/actions/power-on`,
            null,
            {
                withCredentials: this.configuration.withCredentials,
                headers: headers,
                observe: observe,
                reportProgress: reportProgress
            }
        );
    }

    /**
     * Reboot a vsphere virtual machine
     * 
     * @param id 
     * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
     * @param reportProgress flag to report request and response progress.
     */
    public rebootVsphereVirtualMachine(id: string, observe?: 'body', reportProgress?: boolean): Observable<string>;
    public rebootVsphereVirtualMachine(id: string, observe?: 'response', reportProgress?: boolean): Observable<HttpResponse<string>>;
    public rebootVsphereVirtualMachine(id: string, observe?: 'events', reportProgress?: boolean): Observable<HttpEvent<string>>;
    public rebootVsphereVirtualMachine(id: string, observe: any = 'body', reportProgress: boolean = false ): Observable<any> {
        if (id === null || id === undefined) {
            throw new Error('Required parameter id was null or undefined when calling rebootVsphereVirtualMachine.');
        }

        let headers = this.defaultHeaders;

        // authentication (oauth2) required
        if (this.configuration.accessToken) {
            const accessToken = typeof this.configuration.accessToken === 'function'
                ? this.configuration.accessToken()
                : this.configuration.accessToken;
            headers = headers.set('Authorization', 'Bearer ' + accessToken);
        }

        // to determine the Accept header
        let httpHeaderAccepts: string[] = [
            'text/plain',
            'application/json',
            'text/json'
        ];
        const httpHeaderAcceptSelected: string | undefined = this.configuration.selectHeaderAccept(httpHeaderAccepts);
        if (httpHeaderAcceptSelected !== undefined) {
            headers = headers.set('Accept', httpHeaderAcceptSelected);
        }

        // to determine the Content-Type header
        const consumes: string[] = [
        ];

        return this.httpClient.post<string>(`${this.configuration.basePath}/api/vms/vsphere/${encodeURIComponent(String(id))}/actions/reboot`,
            null,
            {
                withCredentials: this.configuration.withCredentials,
                headers: headers,
                observe: observe,
                reportProgress: reportProgress
            }
        );
    }

    /**
     * Set the resolution of a vsphere virtual machine
     * 
     * @param id 
     * @param SetVsphereVirtualMachineResolution 
     * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
     * @param reportProgress flag to report request and response progress.
     */
    public setVsphereVirtualMachineResolution(id: string, SetVsphereVirtualMachineResolution?: SetVsphereVirtualMachineResolution, observe?: 'body', reportProgress?: boolean): Observable<string>;
    public setVsphereVirtualMachineResolution(id: string, SetVsphereVirtualMachineResolution?: SetVsphereVirtualMachineResolution, observe?: 'response', reportProgress?: boolean): Observable<HttpResponse<string>>;
    public setVsphereVirtualMachineResolution(id: string, SetVsphereVirtualMachineResolution?: SetVsphereVirtualMachineResolution, observe?: 'events', reportProgress?: boolean): Observable<HttpEvent<string>>;
    public setVsphereVirtualMachineResolution(id: string, SetVsphereVirtualMachineResolution?: SetVsphereVirtualMachineResolution, observe: any = 'body', reportProgress: boolean = false ): Observable<any> {
        if (id === null || id === undefined) {
            throw new Error('Required parameter id was null or undefined when calling setVsphereVirtualMachineResolution.');
        }

        let headers = this.defaultHeaders;

        // authentication (oauth2) required
        if (this.configuration.accessToken) {
            const accessToken = typeof this.configuration.accessToken === 'function'
                ? this.configuration.accessToken()
                : this.configuration.accessToken;
            headers = headers.set('Authorization', 'Bearer ' + accessToken);
        }

        // to determine the Accept header
        let httpHeaderAccepts: string[] = [
            'text/plain',
            'application/json',
            'text/json'
        ];
        const httpHeaderAcceptSelected: string | undefined = this.configuration.selectHeaderAccept(httpHeaderAccepts);
        if (httpHeaderAcceptSelected !== undefined) {
            headers = headers.set('Accept', httpHeaderAcceptSelected);
        }

        // to determine the Content-Type header
        const consumes: string[] = [
            'application/json',
            'text/json',
            'application/_*+json'
        ];
        const httpContentTypeSelected: string | undefined = this.configuration.selectHeaderContentType(consumes);
        if (httpContentTypeSelected !== undefined) {
            headers = headers.set('Content-Type', httpContentTypeSelected);
        }

        return this.httpClient.post<string>(`${this.configuration.basePath}/api/vms/vsphere/${encodeURIComponent(String(id))}/actions/set-resolution`,
            SetVsphereVirtualMachineResolution,
            {
                withCredentials: this.configuration.withCredentials,
                headers: headers,
                observe: observe,
                reportProgress: reportProgress
            }
        );
    }

    /**
     * Shutdown a vsphere virtual machine
     * 
     * @param id 
     * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
     * @param reportProgress flag to report request and response progress.
     */
    public shutdownVsphereVirtualMachine(id: string, observe?: 'body', reportProgress?: boolean): Observable<string>;
    public shutdownVsphereVirtualMachine(id: string, observe?: 'response', reportProgress?: boolean): Observable<HttpResponse<string>>;
    public shutdownVsphereVirtualMachine(id: string, observe?: 'events', reportProgress?: boolean): Observable<HttpEvent<string>>;
    public shutdownVsphereVirtualMachine(id: string, observe: any = 'body', reportProgress: boolean = false ): Observable<any> {
        if (id === null || id === undefined) {
            throw new Error('Required parameter id was null or undefined when calling shutdownVsphereVirtualMachine.');
        }

        let headers = this.defaultHeaders;

        // authentication (oauth2) required
        if (this.configuration.accessToken) {
            const accessToken = typeof this.configuration.accessToken === 'function'
                ? this.configuration.accessToken()
                : this.configuration.accessToken;
            headers = headers.set('Authorization', 'Bearer ' + accessToken);
        }

        // to determine the Accept header
        let httpHeaderAccepts: string[] = [
            'text/plain',
            'application/json',
            'text/json'
        ];
        const httpHeaderAcceptSelected: string | undefined = this.configuration.selectHeaderAccept(httpHeaderAccepts);
        if (httpHeaderAcceptSelected !== undefined) {
            headers = headers.set('Accept', httpHeaderAcceptSelected);
        }

        // to determine the Content-Type header
        const consumes: string[] = [
        ];

        return this.httpClient.post<string>(`${this.configuration.basePath}/api/vms/vsphere/${encodeURIComponent(String(id))}/actions/shutdown`,
            null,
            {
                withCredentials: this.configuration.withCredentials,
                headers: headers,
                observe: observe,
                reportProgress: reportProgress
            }
        );
    }

    /**
     * Upload a file to a vsphere virtual machine
     * 
     * @param id 
     * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
     * @param reportProgress flag to report request and response progress.
     */
    public uploadFileToVsphereVirtualMachine(id: string, observe?: 'body', reportProgress?: boolean): Observable<string>;
    public uploadFileToVsphereVirtualMachine(id: string, observe?: 'response', reportProgress?: boolean): Observable<HttpResponse<string>>;
    public uploadFileToVsphereVirtualMachine(id: string, observe?: 'events', reportProgress?: boolean): Observable<HttpEvent<string>>;
    public uploadFileToVsphereVirtualMachine(id: string, observe: any = 'body', reportProgress: boolean = false ): Observable<any> {
        if (id === null || id === undefined) {
            throw new Error('Required parameter id was null or undefined when calling uploadFileToVsphereVirtualMachine.');
        }

        let headers = this.defaultHeaders;

        // authentication (oauth2) required
        if (this.configuration.accessToken) {
            const accessToken = typeof this.configuration.accessToken === 'function'
                ? this.configuration.accessToken()
                : this.configuration.accessToken;
            headers = headers.set('Authorization', 'Bearer ' + accessToken);
        }

        // to determine the Accept header
        let httpHeaderAccepts: string[] = [
            'text/plain',
            'application/json',
            'text/json'
        ];
        const httpHeaderAcceptSelected: string | undefined = this.configuration.selectHeaderAccept(httpHeaderAccepts);
        if (httpHeaderAcceptSelected !== undefined) {
            headers = headers.set('Accept', httpHeaderAcceptSelected);
        }

        // to determine the Content-Type header
        const consumes: string[] = [
        ];

        return this.httpClient.post<string>(`${this.configuration.basePath}/api/vms/vsphere/${encodeURIComponent(String(id))}/actions/upload-file`,
            null,
            {
                withCredentials: this.configuration.withCredentials,
                headers: headers,
                observe: observe,
                reportProgress: reportProgress
            }
        );
    }

    /**
     * Validate credentials for a vsphere virtual machine
     * 
     * @param id 
     * @param ValidateVsphereVirtualMachineCredentials 
     * @param observe set whether or not to return the data Observable as the body, response or events. defaults to returning the body.
     * @param reportProgress flag to report request and response progress.
     */
    public validateVsphereVirtualMachineCredentials(id: string, ValidateVsphereVirtualMachineCredentials?: ValidateVsphereVirtualMachineCredentials, observe?: 'body', reportProgress?: boolean): Observable<string>;
    public validateVsphereVirtualMachineCredentials(id: string, ValidateVsphereVirtualMachineCredentials?: ValidateVsphereVirtualMachineCredentials, observe?: 'response', reportProgress?: boolean): Observable<HttpResponse<string>>;
    public validateVsphereVirtualMachineCredentials(id: string, ValidateVsphereVirtualMachineCredentials?: ValidateVsphereVirtualMachineCredentials, observe?: 'events', reportProgress?: boolean): Observable<HttpEvent<string>>;
    public validateVsphereVirtualMachineCredentials(id: string, ValidateVsphereVirtualMachineCredentials?: ValidateVsphereVirtualMachineCredentials, observe: any = 'body', reportProgress: boolean = false ): Observable<any> {
        if (id === null || id === undefined) {
            throw new Error('Required parameter id was null or undefined when calling validateVsphereVirtualMachineCredentials.');
        }

        let headers = this.defaultHeaders;

        // authentication (oauth2) required
        if (this.configuration.accessToken) {
            const accessToken = typeof this.configuration.accessToken === 'function'
                ? this.configuration.accessToken()
                : this.configuration.accessToken;
            headers = headers.set('Authorization', 'Bearer ' + accessToken);
        }

        // to determine the Accept header
        let httpHeaderAccepts: string[] = [
            'text/plain',
            'application/json',
            'text/json'
        ];
        const httpHeaderAcceptSelected: string | undefined = this.configuration.selectHeaderAccept(httpHeaderAccepts);
        if (httpHeaderAcceptSelected !== undefined) {
            headers = headers.set('Accept', httpHeaderAcceptSelected);
        }

        // to determine the Content-Type header
        const consumes: string[] = [
            'application/json',
            'text/json',
            'application/_*+json'
        ];
        const httpContentTypeSelected: string | undefined = this.configuration.selectHeaderContentType(consumes);
        if (httpContentTypeSelected !== undefined) {
            headers = headers.set('Content-Type', httpContentTypeSelected);
        }

        return this.httpClient.post<string>(`${this.configuration.basePath}/api/vms/vsphere/${encodeURIComponent(String(id))}/actions/validate-credentials`,
            ValidateVsphereVirtualMachineCredentials,
            {
                withCredentials: this.configuration.withCredentials,
                headers: headers,
                observe: observe,
                reportProgress: reportProgress
            }
        );
    }

}
