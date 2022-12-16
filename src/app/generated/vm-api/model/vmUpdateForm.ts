/**
 * Player VM API
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: v1
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */
import { ProxmoxVmInfo } from './proxmoxVmInfo';
import { ConsoleConnectionInfo } from './consoleConnectionInfo';


export interface VmUpdateForm { 
    url?: string | null;
    name: string;
    userId?: string | null;
    allowedNetworks?: Array<string> | null;
    consoleConnectionInfo?: ConsoleConnectionInfo;
    proxmoxVmInfo?: ProxmoxVmInfo;
}

