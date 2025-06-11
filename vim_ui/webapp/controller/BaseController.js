sap.ui.define([

    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/UIComponent",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/base/util/deepExtend",
    "sap/ui/core/routing/History",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, JSONModel, UIComponent, Fragment, MessageBox, MessageToast, deepExtend, History, Filter, FilterOperator) {

    var sResponsivePaddingClasses = "sapUiResponsivePadding--header sapUiResponsivePadding--content sapUiResponsivePadding--footer";
    var detailController = null;
    "use strict";

    return Controller.extend("vim_ui.controller.BaseController", {
        setDetailController(controller) {
            detailController = controller;
        },

        getDetailController() { return detailController; },
        /**
         * Function which execute AJAX requests
         * @param {String} sUrl - the url api to forward the requests
         * @param {Sting} sMethod - the method
         * @param {Object} oBody - the payload
         * @param {Function} oSuccessFunction - function to execute in success case
         * @param {Function} oErrorFunction - function to execute in error case
         * @returns 
         */
        executeRequest: function (sUrl, sMethod, oBody, oSuccessFunction, oErrorFunction) {
            // Return a Promise to handle asynchronous request
            return new Promise(function (resolve, reject) {
                $.ajax({
                    url: sUrl,
                    method: sMethod,
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "cache": false
                    },
                    dataType: "json",
                    data: oBody ? oBody : undefined,
                    async: true,
                    // Success callback
                    success: function (oData) {
                        resolve(oSuccessFunction(oData)); // Resolve the promise with return of callback function
                    },
                    // Error callback
                    error: function (XMLHttpRequest, textStatus, errorThrown) {
                        oErrorFunction(XMLHttpRequest, textStatus, errorThrown);
                        reject(errorThrown); // Reject the promise if an error occurs
                    }
                });
            });
        },

        resetState: function () {
            var iJSON = { "href": null, "ui": { "header": { "purchaseOrderNumber": { "id": "idPurchaseOrder" }, "documentDate": { "id": "idDocDate" }, "documentNumber": { "id": "idVendorInvoice" }, "currencyCode": { "id": "idCurrency" }, "grossAmount": { "id": "idGrossAmt" }, "netAmount": { "id": "idNetAmt" }, "senderName": { "id": "idSenderName" }, "receiverName": { "id": "idReceiverName" } } }, "sDialogTitle": null, "DocxLines": [], "NonPoDocxLines": [], "notes": [], "UserList": [], "Filelist": [], "lock": { "lockedBy": null, "lockedAt": null, "user": null }, "props": { "gEditMode": false, "POMode": true, "NONPOModeGLaccount": true, "FileEditMode": false, "lineItemTable": { "editMode": false }, "totalAmount": 0, "totalAmountUnit": 0 }, "valuehelps": { "currency": [], "taxcode": [], "partbank": [], "paymentterms": [], "invdoctyp": [{ "Type": "PO", "Blart": "RE" }, { "Type": "PO", "Blart": "ZE" }, { "Type": "NONPO", "Blart": "KR" }, { "Type": "NONPO", "Blart": "KG" }, { "Type": "NONPO", "Blart": "ZM" }] }, "master": { "list": null }, "detail": { "header": null, "edited": { "CompCode": "", "Vendor": "" } }, "detailDetail": { "header": { "purchaseOrderNumber": { "name": "purchaseOrderNumber", "value": null }, "documentDate": { "name": "documentDate", "value": null }, "documentNumber": { "name": "documentNumber", "value": null }, "grossAmount": { "name": "grossAmount", "value": null }, "netAmount": { "name": "netAmount", "value": null }, "senderName": { "name": "senderName", "value": null }, "receiverName": { "name": "receiverName", "value": null }, "currencyCode": { "name": "currencyCode", "value": null } } }, "dox": {}, "token": null };
            this.packageId = undefined;

            var oModel = this.getOwnerComponent().getModel("appmodel");
            oModel.setProperty("/", iJSON);
        },

        loadDashboard: function () {

            var aURL = jQuery.sap.getModulePath(this.getOwnerComponent().getMetadata().getManifest()["sap.app"].id) + "/odata/extended()";
            sap.ui.core.BusyIndicator.show()
            $.ajax({
                url: aURL,
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "cache": false,
                },
                dataType: "json",
                async: true,
                success: function (oData) {

                    this.getOwnerComponent().getModel("appmodel").setProperty("/master/list", oData.value[0].result)
                    sap.ui.core.BusyIndicator.hide()
                }.bind(this),
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show("Error loading data " + textStatus);
                    console.log(errorThrown);

                }.bind(this)
            });
        },

        onAssignPress: function (oView, oContext) {
            var baseManifestUrl = jQuery.sap.getModulePath(this.getOwnerComponent().getMetadata().getManifest()["sap.app"].id);
            var sUrl = baseManifestUrl + "/odata/users()?";
            var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            
            const oSuccessFunction = (oData) => {
                console.log("Filtered data:", oData);
                var Users = oData.value[0].result;
                this.getOwnerComponent().setModel(new JSONModel({Users}), "UserList");
                sap.ui.core.BusyIndicator.hide();
                 //create dialog
                if (!oContext.byId("idAssignToDialog")) {
                    //load asynchronous fragment (XML)
                    Fragment.load({
                        id: oView.getId(),
                        name: "vim_ui.view.fragments.AssignTo",
                        controller: oContext
                    }).then(function (oMenu) {
                        //connect Menu to rootview of this component (models, lifecycle)
                        oView.addDependent(oMenu);
                        oMenu.open();
                    });
                } else {
                    oContext.byId("idAssignToDialog").open();
                }
                return oData;
            };

            const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
                sap.ui.core.BusyIndicator.hide();
                let sMsg = oBundle.getText("ErrorLoadingData", [textStatus]);
                MessageToast.show(sMsg);
                console.log(errorThrown);
            };

            return this.executeRequest(sUrl, 'GET', null, oSuccessFunction, oErrorFunction);           
        },

        

        onAssignSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            if (sValue) {
                var sFilter = new Filter({
                    filters: [
                        new Filter("FirstName", FilterOperator.Contains, sValue),
                        new Filter("LastName", FilterOperator.Contains, sValue)
                    ]
                });
            }
            var oList = this.getView().byId("idAssignToDialog");
            var oBinding = oList.getBinding("items");
            oBinding.filter(sFilter);
        },

        _confirmDeleteInvoice: function (aPackagesId, bFromInvoicesDetail, context) {
            var body = {}; // Initialize request body
            var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            var sUrl = jQuery.sap.getModulePath(this.getOwnerComponent().getMetadata().getManifest()["sap.app"].id) + `/odata/delete`; // API endpoint for deleting invoice
            // Build the request payload
            body = {
                payload: {
                    PackagesId: aPackagesId
                }
            };

            const oSuccessFunction = (data) => {
                console.log(data);  // Log the successful response
                // Show success message to the user
                MessageBox.success(oBundle.getText("SuccessfullyDeletedInvoice"), {
                    title: "Success",
                    details: data,  // Provide details of the response
                    styleClass: sResponsivePaddingClasses
                });

                // Call nav back function if deletion is happened into invoices detail, otherwise call go press
                if(bFromInvoicesDetail){
                    this.onCancelPress();
                } else {
                    context.onGoPress();
                }
            };

            const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
                console.log(JSON.parse(XMLHttpRequest.responseText).error.message);  // Log the error
            
                // Show error message to the user
                MessageBox.error(oBundle.getText("UnexpectedErrorOccurred"), {
                    title: "Error",
                    details: JSON.parse(XMLHttpRequest.responseText).error.message,  // Provide error details
                    styleClass: sResponsivePaddingClasses,
                    onClose: function () {
                        // If deletion coming from invoices detail call _getData() after error is handled
                        if (bFromInvoicesDetail){
                            context._getData();
                        } else {
                            context.onGoPress();
                        }
                    }
                });

                // If deletion coming from invoices detail call the cancel handler to release the lock even in case of failure
                if (bFromInvoicesDetail){
                    context._confirmCancelEdit();
                }
            };

            // Execute AJAX request
            this.executeRequest(sUrl, 'POST', JSON.stringify(body), oSuccessFunction, oErrorFunction);
        },

        onRejectInvoice: function (oEvent) {

            var url = jQuery.sap.getModulePath(this.getOwnerComponent().getMetadata().getManifest()["sap.app"].id) + "/odata/reject?sMode="
            var oModel = this.getOwnerComponent().getModel("appmodel");
            var sButtonTxt = oEvent.getSource().getText();
            var packageId = oModel.getProperty("/detail/header/PACKAGEID");
            var sText = this.getView().byId("idRejText").getValue();
            var sMsg;
            var sMode = null;

            if (sButtonTxt === "Return to Vendor") {
                sMode = "REJRTV";
                sMsg = "Invoice returned to vendor";
            } else {
                sMode = "REJSAP";
                sMsg = "Invoice rejected for manual entry in SAP";
            }

            var body = {
                payload: {
                    PackageId: packageId,
                    sMode: sMode
                }
            }

            $.ajax({
                url: url,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                dataType: 'json',
                data: body ? JSON.stringify(body) : undefined,
                success: function (data) {
                    MessageToast.show(sMsg);
                },
                error: function (err) {
                    MessageBox.error("Unable to reject", {
                        details: err,
                        styleClass: sResponsivePaddingClasses
                    });
                }
            });

            this.ajax('POST', url, {
                // packageId: packageId,
                // sText: sText
            })
                .then(function (data) {
                    MessageToast.show(sMsg);
                })
                .catch(function (xhr, sStatus, sError) {
                    MessageToast.show(sMsg)
                });
            this.getView().byId("idRejectInvoice").close();
        },

        onCancelReject: function (oEvent) {
            oEvent.getSource().getParent().close();
        },

        getUsers: function (oModel) {
            var oView = this.getView();
            var url = jQuery.sap.getModulePath(this.getOwnerComponent().getMetadata().getManifest()["sap.app"].id) + "/odata/users()";

            $.ajax({
                url: url,
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "cache": false,
                },
                dataType: "json",
                async: true,
                success: function (data) {
                    // console.log(data);
                    oModel.setProperty("/UserList", data.value[0].result);

                }.bind(this),
                error: function (error) {
                    console.log('error loading users', error)
                }.bind(this)
            });
        },

        ajax: function (method, url, body) {
            return new Promise(function (resolve, reject) {
                var token;

                function getCsrf() {
                    return new Promise(function (resolve, reject) {
                        $.ajax({
                            url: "/api/notes/token",
                            method: 'GET',
                            headers: {
                                'X-CSRF-Token': 'Fetch'
                            },
                            async: false,
                            success: function (data, textStatus, request) {
                                token = request.getResponseHeader('x-csrf-token');
                                resolve(data);
                            },
                            error: function (err) {
                                reject(err)
                            }
                        });
                    });
                };

                function getData() {
                    return new Promise(function (resolve, reject) {
                        $.ajax({
                            url: url,
                            method: method,
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json',
                                'cache': false,
                                'X-CSRF-Token': token
                            },
                            dataType: 'json',
                            data: body ? JSON.stringify(body) : undefined,
                            async: false,
                            success: function (data, textStatus, request) {

                                resolve(data);
                            },
                            error: function (err) {
                                reject(err)
                            }
                        });
                    });
                }

                getCsrf()
                    .then(function (data) {
                        getData()
                            .then(function (data) {
                                resolve(data);
                            })
                            .catch(function (error) {
                                reject(error);
                            });

                    }).catch(function (error) {
                        console.log(error);
                        reject(error);
                    });
            });
        },

        getRouter: function () {
            return UIComponent.getRouterFor(this);
        },

        onGoBackPress: function () {
            var oHistory, sPreviousHash;

            oHistory = History.getInstance();
            sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getRouter().navTo("master", {}, true /*no history*/);
            }

        },

        onCancelPress: function () {
            this.getRouter().navTo("master", {}, true /*no history*/);

            // var hashUrl = window.location.hash;
            // var fullUrl = window.location.href;
            // var initUrl = fullUrl.split(hashUrl)[0];
            // window.history.replaceState({}, document.title, initUrl)
            // window.location.replace(initUrl);
        },

        /* Fetch Document service X-CSRF token */
        _fetchDocServiceToken: function () {
            var eToken;
            $.ajax({
                url: this._getRuleServiceBaseURL() + "/xsrf-token",
                method: "GET",
                async: false,
                headers: {
                    "X-CSRF-Token": "Fetch"
                },
                success: function (t, a, i) {
                    eToken = i.getResponseHeader("X-CSRF-Token")
                }
            });
            return eToken
        },
        _getRuleServiceBaseURL: function () {
            var componentName = this.getOwnerComponent().getManifestEntry("/sap.app/id").replaceAll(".", "/");
            var componentPath = jQuery.sap.getModulePath(componentName);
            return componentPath + "/bpmrulesruntime/rules-service/rest/v2";
        },

        getCurrentDate: function () {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are zero-based
            const day = String(today.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    });
});