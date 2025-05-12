sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Sorter",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "sap/ui/core/ValueState",
    "vim_ui/utils/formatter"
], function (BaseController, JSONModel, Sorter, MessageToast, MessageBox, Fragment, ValueState, formatter) {
    "use strict";
    //manifest base URL
    var baseManifestUrl;
    var oBundle;

    return BaseController.extend("vim_ui.controller.Master", {
        formatter: formatter,

        /**
         * Initialize the controller
         * Set up router and attach the route pattern matcher.
         */
        onInit: function () {
            // read msg from i18n model
            oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            //set manifest base URL
            baseManifestUrl = jQuery.sap.getModulePath(this.getOwnerComponent().getMetadata().getManifest()["sap.app"].id);
            this.oRouter = this.getOwnerComponent().getRouter();
            this.oRouter.getRoute("master").attachPatternMatched(this._onRouteMatched, this);
            this._bDescendingSort = false;
        },

        /**
         * Method triggered when the route pattern is matched.
         * Prepares the model and initializes the page state.
         */
        _onRouteMatched: function () {
            this.defineModelForCurrentPage();
            this._setDefaultDocumentStatus();
            this.onGoPress();
            this.resetState();
        },

        _setDefaultDocumentStatus() {
            // Set default document status 
            this.getView().byId("idSelectDocStatus").setSelectedKeys(["INITIAL", "ASSIGN", "PROCESSING", "ERROR"]);
        },

        /**
         * Define the model for the current page and attach it to the view.
         */
        defineModelForCurrentPage: function () {
            var oModel = {
                "list": []
            };
            this.getView().setModel(new JSONModel(oModel), "masterModel");
        },

        /**
         * Triggered when the user presses the "Go" button to apply filters and fetch data.
         * Define top and skip parameters for pagination
         */
        onGoPress: function (oEvent) {
            this._iSkip = 0; // Reset skip counter on new search
            this._iTop = 2 * this.getView().byId("masterTable").getGrowingThreshold();
            this.getView().getModel("masterModel").setProperty("/list", []);
            this._loadData();
        },


        /**
         * Load data with current filters and pagination parameters.
         * It constructs the query parameters from the input fields and sends an AJAX request to the backend.
         */
        _loadData: function () {
            var oView = this.getView();
            var sDocStatus = oView.byId("idSelectDocStatus").getSelectedKeys();
            var sAssignedTo = oView.byId("idAssignedToInp").getValue();
            var sDocCategory = oView.byId("idSelectDocumentCategory").getSelectedKey();
            var sVendor = oView.byId("idSentByInp").getValue();
            var sInvoiceNumber = oView.byId("idInvoiceNumber").getValue();
            var sVAT = oView.byId("idVATRegistrationNumber").getValue();
            var sDateFrom = oView.byId("idData").getDateValue();
            var sDateTo = oView.byId("idData").getSecondDateValue();
            var sCreatedDateFrom = oView.byId("idSentOn").getDateValue();
            var sCreatedDateTo = oView.byId("idSentOn").getSecondDateValue();

            // Build query URL with parameters
            var sUrl = this._buildFilterQuery(sDocStatus, sAssignedTo, sDocCategory, sVendor, sInvoiceNumber, sVAT, sDateFrom, sDateTo, sCreatedDateFrom, sCreatedDateTo);

            // Get the master model to update the data list after the request
            var oMasterModel = this.getView().getModel("masterModel");
            sap.ui.core.BusyIndicator.show();

            const oSuccessFunction = (oData) => {
                console.log("Filtered data:", oData);
                var aCurrentData = oMasterModel.getProperty("/list");
                var aNewData = aCurrentData.concat(oData.value[0].result);
                oMasterModel.setProperty("/list", aNewData);
                sap.ui.core.BusyIndicator.hide();
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

        /**
         * Helper method to build the query URL with the given parameters.
         */
        _buildFilterQuery: function (sDocStatus, sAssignedTo, sDocCategory, sVendor, sInvoiceNumber, sVAT, sDateFrom, sDateTo, sCreatedDateFrom, sCreatedDateTo) {
            var url = baseManifestUrl + "/odata/extended()?";
            var aParams = [];

            if (sDocStatus.length) {
                aParams.push("DOC_STATUS=" + sDocStatus);
            }
            if (sAssignedTo) {
                aParams.push("ASSIGNEDTO=" + sAssignedTo);
            }
            if (sDocCategory) {
                aParams.push("DOCCATEGORY=" + sDocCategory);
            }
            if (sVendor) {
                aParams.push("VENDOR_NAME=" + sVendor);
            }
            if (sInvoiceNumber) {
                aParams.push("INVOICENUMBER=" + sInvoiceNumber);
            }
            if (sVAT) {
                aParams.push("VAT=" + sVAT);
            }
            if (sCreatedDateFrom || sCreatedDateTo) {
                aParams.push("CREATEDAT=" + sCreatedDateFrom.toJSON() + "," + sCreatedDateTo.toJSON());
            }
            if (sDateFrom || sDateTo) {
                aParams.push("DATA=" + sDateFrom.toJSON() + "," + sDateTo.toJSON());
            }

            aParams.push("$top=" + this._iTop);
            aParams.push("$skip=" + this._iSkip);

            return url + aParams.join("&");
        },

        /**
         * Event handler for growing event of the table.
         * Fetches additional data with pagination.
         */
        onTableGrowing: function (oEvent) {
            if (oEvent.getParameters().reason === 'Growing') {
                this._iSkip += this._iTop;
                this._loadData();
            }
        },

        /**
         * Clear all filter input fields when the user presses the clear button.
         */
        onClearFilterBar: function (oEvent) {
            var oView = this.getView();
            oView.byId("idSelectDocStatus").setSelectedKeys(null);
            oView.byId("idAssignedToInp").setValue(null);
            oView.byId("idSelectDocumentCategory").setSelectedKey(null);
            oView.byId("idSentByInp").setValue(null);
            oView.byId("idInvoiceNumber").setValue(null);
            oView.byId("idVATRegistrationNumber").setValue(null);
            oView.byId("idSentOn").setDateValue(null);
            oView.byId("idSentOn").setSecondDateValue(null);
            oView.byId("idData").setDateValue(null);
            oView.byId("idData").setSecondDateValue(null);
        },

        /**
         * Event handler for list item press.
         * Navigates to the detail view based on the selected package ID.
         */
        onListItemPress: function (oEvent) {
            var packageId = oEvent.getSource().getBindingContext("masterModel").getObject().PACKAGEID;
            this.oRouter.navTo("detailDetail", { layout: sap.f.LayoutType.TwoColumnsMidExpanded, packageId: packageId });
        },

        /**
         * Unlocks a document by sending an AJAX POST request.
         */
        onUnlock: function (oEvent) {
            var that = this;
            var url = baseManifestUrl + "/odata/unlock";
            var sPackageId = this.getView().getModel("masterModel").getProperty(this.oCtx + "/PACKAGEID");

            if (!sPackageId) {
                let sMsg = oBundle.getText("DocumentCannotBeUnlocked");
                MessageToast.show(sMsg);
                return;
            }

            var body = {
                payload: {
                    PackageId: sPackageId
                }
            };

            $.ajax({
                url: url,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                dataType: 'json',
                data: JSON.stringify(body),
                success: function (data) {
                    let sMsg = oBundle.getText("DocumentUnlocked");
                    MessageBox.information(sMsg, {
                        onClose: function () {
                            that.onGoPress();
                        }
                    });
                },
                error: function (err) {
                    let sMsg = oBundle.getText("UnableToUnlock");
                    console.log("FAILED TO REMOVE LOCK", err);
                    MessageBox.information(sMsg, {
                        onClose: function () {
                            that.onGoPress();
                        }
                    });
                }
            });
        },


        onQuickEditPress: function (oEvent) {
            this.oCtx = oEvent.getSource().getBindingContext('masterModel');
            this._quickEditPress(oEvent);
        },

        /**
         * Event handler for quick edit action.
         * Loads and opens a fragment (contextual menu) for the selected list item.
         */
        _quickEditPress: function (oEvent) {
            var oControl = oEvent.getSource(),
                oView = this.getView();

            if (!this._oMenuFragment) {
                Fragment.load({
                    id: oView.getId(),
                    name: "vim_ui.view.fragments.MasterMenu",
                    controller: this
                }).then(function (oMenu) {
                    oView.addDependent(oMenu);
                    oMenu.openBy(oControl);
                    this._oMenuFragment = oMenu;
                }.bind(this));
            } else {
                this._oMenuFragment.openBy(oControl);
            }
        },


        onQuickUnlockPress: function (oEvent) {
            this.oCtx = oEvent.getSource().getBindingContext('masterModel');
            this._quickUnlockPress(oEvent);
        },

        _quickUnlockPress: function (oEvent) {
            var oControl = oEvent.getSource(),
                oView = this.getView();

            if (!this._oLockMenuFragment) {
                Fragment.load({
                    id: oView.getId(),
                    name: "vim_ui.view.fragments.LockMenu",
                    controller: this
                }).then(function (oMenu) {
                    oView.addDependent(oMenu);
                    oMenu.openBy(oControl);
                    this._oLockMenuFragment = oMenu;
                }.bind(this));
            } else {
                this._oLockMenuFragment.openBy(oControl);
            }
        },

        onQuickMassiveEditPress: function (oEvent) {
            this.oCtx = null;
            this._quickEditPress(oEvent);
        },

        onAssignPressHandler: function (oEvent) {
            var oMasterModel = this.getView().getModel("masterModel");
            var sLockedByName = oMasterModel.getProperty(this.oCtx + "/LOCKEDBYNAME");
            if (sLockedByName) {
                MessageBox.warning(oBundle.getText("AlertLocked", sLockedByName));
                return
            }
            this.onAssignPress(this.getView(), this);
        },

        _confirmAssignation: function (sUrl, body) {
            const oSuccessFunction = (data) => {
                MessageBox.success(oBundle.getText("SuccessfullyAssigned"), {
                    actions: [MessageBox.Action.CLOSE],
                    title: "Success",
                    details: data,  // Provide details of the response
                    onClose: function () {
                        this.onGoPress();
                    }.bind(this)
                });
            };

            const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
                sap.ui.core.BusyIndicator.hide();
                let sMsg = oBundle.getText("UnexpectedErrorOccurred");
                MessageToast.show(sMsg);
                console.log(errorThrown);
                this.onGoPress();
            };

            return this.executeRequest(sUrl, 'POST', JSON.stringify(body), oSuccessFunction, oErrorFunction);
        },

        onAssignConfirm: function (oEvent) {
            var oTable = this.getView().byId("masterTable"),
                oMasterModel = this.getView().getModel("masterModel"),
                aSelectedItems = oTable.getSelectedItems(),
                aPackagesId = [],
                bIsMassiveAction = this.oCtx !== null ? false : true,
                sUrl,
                body = undefined,
                assignTo = oEvent.getParameter('selectedItem').getBindingContext('UserList').getObject('Email'),
                that = this;

            if (!bIsMassiveAction) {
                var sLockedByName = oMasterModel.getProperty(this.oCtx + "/LOCKEDBYNAME");
                if (sLockedByName) {
                    MessageBox.warning(oBundle.getText("AlertLocked", sLockedByName));
                    return
                }
                let sPath = this.oCtx.getPath();
                aPackagesId.push(this.getView().getModel("masterModel").getProperty(sPath + "/PACKAGEID"));
            } else {
                let bIsDocumentLocked = false;
                aSelectedItems.forEach(oItem => {
                    if (oItem.getBindingContext("masterModel").getProperty("LOCKEDBYNAME") !== null) {
                        bIsDocumentLocked = true;
                    }
                });

                if (bIsDocumentLocked) {
                    MessageBox.warning(oBundle.getText("MassiveAlertLocked"));
                    return;
                }
                aPackagesId = aSelectedItems.map((oItem) =>
                    oItem.getBindingContext("masterModel").getProperty("PACKAGEID")
                );
            }

            sUrl = baseManifestUrl + '/odata/assign';
            body = {
                payload: {
                    PackagesId: aPackagesId,
                    AssignedTo: assignTo
                }
            };

            MessageBox.warning(oBundle.getText("AlertAssign", [assignTo]), {
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                emphasizedAction: MessageBox.Action.NO,
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.YES) {
                        that._confirmAssignation(sUrl, body);
                    }
                }
            });
        },


        /**
         * Event handler to handle forward action with parameters from the selected list item.
         */
        _forwardPunctualPressHandler: function (oEvent) {
            var oMasterModel = this.getView().getModel("masterModel");
            var sDocStatus = oMasterModel.getProperty(this.oCtx + "/DOC_STATUS");
            var sPackage_Id = oMasterModel.getProperty(this.oCtx + "/PACKAGEID");
            var sLockedByName = oMasterModel.getProperty(this.oCtx + "/LOCKEDBYNAME");
            if (sLockedByName) {
                MessageBox.warning(oBundle.getText("AlertLocked", sLockedByName));
                return
            }
            this.onAssignPress();
        },

        /**
         * Event handler for sorting the table by the "Name" column.
         * It toggles between ascending and descending order.
         */
        onSort: function (oEvent) {
            this._bDescendingSort = !this._bDescendingSort;
            var oView = this.getView(),
                oTable = oView.byId("productsTable"),
                oBinding = oTable.getBinding("items"),
                oSorter = new Sorter("Name", this._bDescendingSort);

            oBinding.sort(oSorter);
        },


        onSelectionChange: function (oEvent) {
            var oTable = oEvent.getSource(),
                aItems = oTable.getSelectedItems(),
                bShowFooter = aItems.length > 0,
                bEnableQuickMassiveEdit = aItems.length > 1;
            oTable.getItems().forEach(oItem => {
                if (aItems.length > 1) {
                    oItem.getAggregation("cells")[8].setEnabled(false);
                } else {
                    oItem.getAggregation("cells")[8].setEnabled(true);
                }
            });
            this.getView().byId("dynamicPageId").setShowFooter(bShowFooter);
            this.getView().byId("quickMassiveActionButton").setEnabled(bEnableQuickMassiveEdit);
        },

        onDeletePress: function () {
            var oTable = this.getView().byId("masterTable"),
                oMasterModel = this.getView().getModel("masterModel"),
                aSelectedItems = oTable.getSelectedItems(),
                aPackagesId = [],
                bIsMassiveAction = this.oCtx !== null ? false : true,
                that = this;

            if (!bIsMassiveAction) {
                var sLockedByName = oMasterModel.getProperty(this.oCtx + "/LOCKEDBYNAME");
                if (sLockedByName) {
                    MessageBox.warning(oBundle.getText("AlertLocked", sLockedByName));
                    return
                }
                let sPath = this.oCtx.getPath();
                aPackagesId.push(this.getView().getModel("masterModel").getProperty(sPath + "/PACKAGEID"));
            } else {
                let bIsDocumentLocked = false;
                aSelectedItems.forEach(oItem => {
                    if (oItem.getBindingContext("masterModel").getProperty("LOCKEDBYNAME") !== null) {
                        bIsDocumentLocked = true;
                    }
                });

                if (bIsDocumentLocked) {
                    MessageBox.warning(oBundle.getText("MassiveAlertLocked"));
                    return;
                }
                aPackagesId = aSelectedItems.map((oItem) =>
                    oItem.getBindingContext("masterModel").getProperty("PACKAGEID")
                );
            }

            MessageBox.warning(oBundle.getText("DeleteInvoiceAlert"), {
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                emphasizedAction: MessageBox.Action.NO,
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.YES) {
                        that._confirmDeleteInvoice(aPackagesId, false, that);
                    }
                }
            });
        },

        onSubmitPress: function () {
            var oTable = this.getView().byId("masterTable"),
                oMasterModel = this.getView().getModel("masterModel"),
                aSelectedItems = oTable.getSelectedItems(),
                bIsDocumentLocked = false,
                that = this;

            aSelectedItems.forEach(oItem => {
                if (oItem.getBindingContext("masterModel").getProperty("LOCKEDBYNAME") !== null) {
                    bIsDocumentLocked = true;
                }
            });

            if (bIsDocumentLocked) {
                MessageBox.warning(oBundle.getText("MassiveAlertLocked"));
                return;
            }

            aSelectedItems = aSelectedItems.map(oItem => {
                if (oItem.getBindingContext("masterModel").getProperty("DOC_STATUS") !== "SUBMITTED") {
                    return {
                        "PackageId": oItem.getBindingContext("masterModel").getProperty("PACKAGEID"),
                        "DocCategory": oItem.getBindingContext("masterModel").getProperty("DOCCATEGORY")
                    };
                }
            });

            let sMsg = oBundle.getText("MassiveSubmitMessageBox");
            MessageBox.warning(sMsg, {
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.YES) {
                        sap.ui.core.BusyIndicator.show();
                        const sUrl = "/odata/massiveSubmit"
                        const oSuccessFunction = (oData) => {
                            sap.ui.core.BusyIndicator.hide();
                            var aErrorInvoicesPackageIds = oData.value[0].ErrorInvoicesPackageIds;
                            if (aErrorInvoicesPackageIds.length > 0) {
                                let sMsg = oBundle.getText("MassiveSubmitFailed");
                                MessageBox.error(sMsg, {
                                    onClose: function () {
                                        that.onGoPress();
                                    }
                                });
                            } else {
                                let sMsg = oBundle.getText("MassiveSubmitSucceded");
                                MessageBox.success(sMsg, {
                                    onClose: function () {
                                        that.onGoPress();
                                    }
                                });
                            }
                        };

                        const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
                            sap.ui.core.BusyIndicator.hide();
                            let sMsg = oBundle.getText("BackendRequestFailed");
                            MessageBox.error(sMsg, {
                                onClose: function () {
                                    that.onGoPress();
                                }
                            });
                        };
                        const oBody = {
                            payload: aSelectedItems
                        }

                        that.executeRequest(sUrl, "POST", JSON.stringify(oBody), oSuccessFunction, oErrorFunction);
                    }
                }
            });
        }
    });
});
