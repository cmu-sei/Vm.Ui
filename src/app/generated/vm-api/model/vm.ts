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
import { ConsoleConnectionInfo } from './consoleConnectionInfo';
import { PowerState } from './powerState';


export interface Vm { 
    /**
     * Virtual Machine unique id
     */
    id?: string;
    /**
     * Url to the Vm's console
     */
    url?: string;
    /**
     * The Vm's name
     */
    name?: string;
    /**
     * Id of the Vm's owner if it is a personal Vm
     */
    userId?: string;
    /**
     * A list of networks that a regular user can access
     */
    allowedNetworks?: Array<string>;
    powerState?: PowerState;
    /**
     * A list of IP addresses of the Vm
     */
    ipAddresses?: Array<string>;
    /**
     * The Ids of the Team's the Vm is a part of
     */
    teamIds?: Array<string>;
    /**
     * True if this Vm currently has pending tasks (power on, power off, etc)
     */
    hasPendingTasks?: boolean;
    consoleConnectionInfo?: ConsoleConnectionInfo;
}
