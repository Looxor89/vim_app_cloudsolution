/* global _:true */
sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/base/util/deepExtend",
  "sap/ui/core/Fragment",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "vim_ui/utils/formatter",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/m/MessagePopover",
  "sap/m/MessageItem",
  "sap/base/util/uid",
  "vim_ui/utils/moment",
  "vim_ui/utils/lodash",
  "vim_ui/Util/Util"
], function (BaseController, JSONModel, deepExtend, Fragment, Filter, FilterOperator, formatter, MessageToast, MessageBox, MessagePopover, MessageItem, uid, Moment, Lodash, Util) {
  "use strict";

  var sResponsivePaddingClasses = "sapUiResponsivePadding--header sapUiResponsivePadding--content sapUiResponsivePadding--footer";
  //manifest base URL
  var baseManifestUrl;
  var oBundle;
  var aRemovedSupplierInvoiceWhldgTaxRecords;
  var aRemovedPoLineDetails;
  var aRemovedGlAccountLineDetails;
  var aNewSelectedPurchaseOrdersRecords;
  var aNewSelectedDeliveryNotesRecords;
  var aNewSelectedServiceEntrySheetsRecords;

  return BaseController.extend("vim_ui.controller.DetailDetail", {
    formatter: formatter,
    _sTestVar: "test",
    onInit: function () {
      // read msg from i18n model
      oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
      //set manifest base URL
      baseManifestUrl = jQuery.sap.getModulePath(this.getOwnerComponent().getMetadata().getManifest()["sap.app"].id);

      aRemovedSupplierInvoiceWhldgTaxRecords = [];
      aRemovedPoLineDetails = [];
      aRemovedGlAccountLineDetails = [];
      aNewSelectedPurchaseOrdersRecords = [];
      aNewSelectedDeliveryNotesRecords = [];
      aNewSelectedServiceEntrySheetsRecords = [];

      // Retrieve the buttons for full-screen exit and enter and store them for later use
      var oExitButton = this.getView().byId("exitFullScreenBtn"),
        oEnterButton = this.getView().byId("enterFullScreenBtn");

      // Initialize the router and models for the view
      this.oRouter = this.getOwnerComponent().getRouter();
      this.oModel = this.getOwnerComponent().getModel(); // Default model
      this.appmodel = this.getOwnerComponent().getModel("appmodel"); // App-specific model

      // Attach the route "detailDetail" to a handler function `_onRouteMatched` for when the route is accessed
      this.oRouter.getRoute("detailDetail").attachPatternMatched(this._onRouteMatched, this);

      // Retrieve templates for read-only views in the table for displaying data
      this.oReadOnlyTemplate = this.getView().byId("readTemplate"); // For PO Line Items
      this.oTaxTemplate = this.getView().byId("idTaxCodeTmp"); // For tax codes

      /**
       * Define editable table templates for PO Line Items with input fields.
       * These templates will be dynamically used to render rows with editable fields
       * including multiple inputs such as PO number, quantity, amount, and tax code.
       */
      this.oEditableTemplate = new sap.m.ColumnListItem({
        cells: [
          // Invoice Line Item input (numeric)
          new sap.m.Input({
            value: "{detailDetailModel>InvoiceLineItem}",
            type: "Number",
            maxLength: 10
          }),
          // PO Number input field with value help for multiple PO scenarios
          new sap.m.Input({
            value: "{detailDetailModel>PONumber}",
            showValueHelp: true,
            valueHelpRequest: this.onMultiplePOVH.bind(this), // Value help handler for multiple POs
            change: this.onMultiPOInputChange.bind(this), // Handle changes in multiple POs
            maxLength: 10,
            visible: "{detailDetailModel>/detailDetail/header/bMultiplePO}" // Visibility condition
          }),
          // Concatenated PO number and PO line item, with value help for PO search
          new sap.m.Input({
            value: "{detailDetailModel>PONumber} - {detailDetailModel>POLineItem}",
            showValueHelp: true,
            valueHelpRequest: this.onPurchOrderVH.bind(this), // Value help handler for PO search
            maxLength: 16
          }),
          // Amount input field with specific decimal formatting and constraints
          new sap.m.Input({
            value: {
              path: 'detailDetailModel>Amount',
              type: 'sap.ui.model.odata.type.Decimal',
              formatOptions: {
                minFractionDigits: 0,
                maxFractionDigits: 3,
                groupingEnabled: false
              },
              constraints: {
                precision: 23,
                scale: 4
              }
            }
          }),
          // Quantity input field with decimal formatting and constraints
          new sap.m.Input({
            value: {
              path: 'detailDetailModel>Quantity',
              type: 'sap.ui.model.odata.type.Decimal',
              formatOptions: {
                minFractionDigits: 0,
                maxFractionDigits: 3,
                groupingEnabled: false
              },
              constraints: {
                precision: 13,
                scale: 3
              }
            }
          }),
          // Order Unit input field with decimal formatting and constraints
          new sap.m.Input({
            value: {
              path: 'detailDetailModel>OrderUnit',
              type: 'sap.ui.model.odata.type.Decimal',
              formatOptions: {
                minFractionDigits: 0,
                maxFractionDigits: 3,
                groupingEnabled: false
              },
              constraints: {
                precision: 13,
                scale: 3
              }
            }
          }),
          // Description input field for the line item
          new sap.m.Input({
            value: "{detailDetailModel>Description}",
            maxLength: 50
          }),
          // Tax Code input field with value help for tax code selection
          new sap.m.Input({
            value: "{detailDetailModel>TaxCode}",
            showValueHelp: true,
            valueHelpRequest: this.onTaxCodeVH.bind(this), // Value help handler for tax code
            maxLength: 2
          }),
          // Business Area input field
          new sap.m.Input({
            value: "{detailDetailModel>BusinessArea}",
            maxLength: 50
          }),
          // Cost Center input field
          new sap.m.Input({
            value: "{detailDetailModel>CostCenter}",
            maxLength: 50
          }),
          // WBS Element input field
          new sap.m.Input({
            value: "{detailDetailModel>WBSElement}",
            maxLength: 50
          }),
          // Order input field
          new sap.m.Input({
            value: "{detailDetailModel>Order}",
            maxLength: 50
          }),
          // Supplier input field
          new sap.m.Input({
            value: "{detailDetailModel>Supplier}",
            maxLength: 50
          }),
          // Material input field
          new sap.m.Input({
            value: "{detailDetailModel>Material}",
            maxLength: 50
          }),
          // Valuation Type input field
          new sap.m.Input({
            value: "{detailDetailModel>ValuationType}",
            maxLength: 50
          }),
          // Material Group input field
          new sap.m.Input({
            value: "{detailDetailModel>MaterialGroup}",
            maxLength: 50
          }),
          // Plant input field
          new sap.m.Input({
            value: "{detailDetailModel>Plant}",
            maxLength: 50
          }),
          // Valuation Area input field
          new sap.m.Input({
            value: "{detailDetailModel>ValuationArea}",
            maxLength: 50
          })
        ]
      });

      // Read-only templates for NON-PO G/L account and asset line items
      this.oReadOnlyGLAccountTemplateNPo = this.getView().byId("readNonPOGLAccountTemplate");

    },

    createMessagePopover: function () {
      let sTitle = oBundle.getText("MessagePopoverError");
      this.oMP = new MessagePopover({
        items: {
          path: "detailDetailModel>/errorLog",
          template: new MessageItem(
            {
              title: sTitle,
              type: "Error",
              description: "{detailDetailModel>ErrorMessage}\n{detailDetailModel>ID}"
            })
        }
      });

      this.getView().byId("messagePopoverBtn").addDependent(this.oMP);
    },

    handleMessagePopoverPress: function (oEvent) {
      let control = oEvent ? oEvent.getSource() : this.getView().byId("messagePopoverBtn");
      if (!this.oMP) {
        this.createMessagePopover();
      }
      this.oMP.toggle(control);
    },

    defineModelForCurrentPage: function () {
      /**
       * This is the model bound to the current page. It contains the following sections:
       * - props: properties of the invoice, such as whether it is with or without a purchase order, and other related attributes.
       * - lock: a flag indicating whether the current invoice is locked or not.
       * - detail: information bound to the DynamicPageTitle.
       * - header: contains the invoice's header information.
       * - DocxLines: the body content in case the invoice has a purchase order.
       * - NonPoDocxLines: the body content in case the invoice does not have a purchase order.
       * - Filelist: an array containing the invoice's attachments.
       * - NewUploadedFile: an object containing a new uploaded file
       * - notes: an array containing the invoice's notes.
       * - valuehelps: contains all values bound to Input controls where the attribute showValueHelp is set to true.
       */
      var oModel = {
        "props": {
          "POMode": true,
          "bMultiplePO": false,
          "NONPOModeGLaccount": false,
          "FileEditMode": false,
          "gEditMode": false,
          "lineItemTable": {
            "editMode": false,
          },
        },
        "lock": null,
        "detail": {
          "header": null
        },
        "currentInvoice": null,
        "header": {
          "transaction": null,
          "companyCode": null,
          "documentDate": null,
          "dueCalculationBaseDate": null,
          "invoiceDate": null,
          "invoicingPartyVendorCode": null,
          "reference": null,
          "headerText": null,
          "assignment": null,
          "postingDate": null,
          "currency": null,
          "grossAmount": null,
          "netAmount": null,
          "paymentTerms": null,
          "paymentMethod": null,
          "documentType": null,
          "taxAmount": null,
          "taxCode": null,
          "supplierPostingLineItemText": null,
          "taxIsCalculatedAutomatically": null,
          "manualCashDiscount": null,
          "cashDiscount1Days": null,
          "cashDiscount1Percent": null,
          "cashDiscount2Days": null,
          "cashDiscount2Percent": null,
          "fixedCashDiscount": null,
          "netPaymentDays": null,
          "bpBankAccountInternalId": null,
          "invoiceReference": null,
          "invoiceReferenceFiscalYear": null,
          "houseBank": null,
          "houseBankAccount": null,
          "paymentBlockingReason": null,
          "paymentReason": null,
          "unplannedDeliveryCost": null,
          "supplyingCountry": null,
          "isEuTriangularDate": null,
          "taxDeterminationDate": null,
          "taxReportingDate": null,
          "taxFulfillmentDate": null,
          "withholdingTaxType": null,
          "withholdingTaxBaseAmount": null,
          "withholdingTaxCode": null
        },
        "DocxLines": [],
        "NonPoDocxLines": [],
        "Filelist": null,
        "NewUploadedFile": null,
        "notes": [],
        "valuehelps": {
          "multiplePOValueHelp": [],
          "paymentterms": [],
          "currency": [],
          "taxcode": []
        }
      }
      this.getView().setModel(new JSONModel(oModel), "detailDetailModel");
    },

    onCloseAddByCopyRow: function () {
      MessageBox.warning(oBundle.getText("AlertCancelCloseAddByCopyPORow"), {
        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
        emphasizedAction: MessageBox.Action.NO,
        onClose: function (sAction) {
          if(sAction === "YES") {
            aNewSelectedPurchaseOrdersRecords = [];
            aNewSelectedDeliveryNotesRecords = [];
            aNewSelectedServiceEntrySheetsRecords = [];
            this.getView().getModel("detailDetailModel").setProperty("/currentInvoice/To_SelectedPurchaseOrders", []);
            this.getView().getModel("detailDetailModel").setProperty("/currentInvoice/To_SelectedDeliveryNotes", []);
            this.getView().getModel("detailDetailModel").setProperty("/currentInvoice/To_SelectedServiceEntrySheets", []);
            this.getView().byId("addPoCopyDialog").close();
          }
        }.bind(this)
      });
    },

    onAddByCopyPORow: function (oEvent) {
      this.oInput = oEvent.getSource();
      var oView = this.getView();
      oView.getModel("detailDetailModel").setProperty("/currentInvoice/To_SelectedPurchaseOrders", []);
      oView.getModel("detailDetailModel").setProperty("/currentInvoice/To_SelectedDeliveryNotes", []);
      oView.getModel("detailDetailModel").setProperty("/currentInvoice/To_SelectedServiceEntrySheets", []);
      //create dialog
      if (!this.getView().byId("addPoCopyDialog")) {
        //load asynchronous fragment (XML)
        Fragment.load({
          id: oView.getId(),
          name: "vim_ui.view.fragments.AddCopyPo",
          controller: this
        }).then(function (oDialog) {
          //connect Menu to rootview of this component (models, lifecycle)
          oView.addDependent(oDialog);
          oDialog.open();
        });
      } else {
        oView.byId("addPoCopyDialog").open();
      }
    },

    resetUIState: function () {
      var oTable = this.getView().byId("idInvLineItemTable");
      oTable.setSelectionMode("None");
      var oTable = this.getView().byId("idNPOInvGLAccountLineTable");
      oTable.setSelectionMode("None");
      var oTable = this.getView().byId("idSupplierInvoiceWhldgTaxTable");
      oTable.setSelectionMode("None");
      // Select first body IconTabFilter
      var oTabBarBodyInvoice = this.byId("iconTabBarBodyInvoice");
      oTabBarBodyInvoice.setSelectedKey(oTabBarBodyInvoice.getItems()[0].sId);

    },

    // Function to rebind the table based on the PO mode and update the keyboard mode
    rebindTable: function (oTemplate, sKeyboardMode, bPOTemplate) {
      var oDetailDetailModel = this.getView().getModel("detailDetailModel");

      // Check if the current mode is PO (Purchase Order) mode
      if (bPOTemplate) {
        var oTable = this.getView().byId("idInvLineItemTable"); // Get PO table

        // Bind PO-related line items to the table and set keyboard mode
        oTable.bindAggregation("items", {
          path: "detailDetailModel>/DocxLines", // Path to PO line items
          template: oTemplate,
          templateShareable: true, // Ensure the template is shareable
          key: "InvoiceLineItem" // Define the key for each item
        }).setKeyboardMode(sKeyboardMode); // Set keyboard navigation mode

      } else {
        var oTable = this.getView().byId("idNPOInvGLAccountLineTable"); // Get Non-PO table

        // Bind Non-PO-related line items to the table and set keyboard mode
        oTable.bindAggregation("items", {
          path: "detailDetailModel>/NonPoDocxLines", // Path to Non-PO line items
          template: oTemplate,
          templateShareable: true,
          key: "InvoiceLineItem"
        }).setKeyboardMode(sKeyboardMode); // Set keyboard navigation mode
      }
      this.aRemovedSupplierInvoiceWhldgTaxRecords = [];
      this.aRemovedPoLineDetails = [];
      this.aRemovedGlAccountLineDetails = [];
    },

    // Function to fetch notes associated with a package ID from the backend
    fetchNotes: function (packageId) {
      var sURL = baseManifestUrl + "/odata/notes()?PackageId=" + packageId; // Construct the API URL
      var oDetailDetailModel = this.getView().getModel("detailDetailModel");

      const oSuccessFunction = (data) => {
        // Store the fetched notes in the model and refresh the view
        oDetailDetailModel.setProperty("/notes", data.value[0].result);
        oDetailDetailModel.refresh(); // Ensure model updates reflect in the UI
      };

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        console.log(errorThrown);  // Log the error
      };

      return this.executeRequest(sURL, 'GET', null, oSuccessFunction, oErrorFunction);
    },

    // Function to add a new note via a POST request to the backend
    onAddNotes: function (oEvent) {
      var sNotes = this.getView().byId("idNotesTxtArea").getValue(); // Get user-entered note
      var sUrl = baseManifestUrl + "/odata/addNotes"; // API URL for adding a new note
      var obj = {
        payload: {
          PackageId: this._packageId, // Current package ID
          Subject: 'Comment', // Set subject to "Comment"
          Note: sNotes // Note content entered by the user
        }
      };

      const oSuccessFunction = (data) => {
        sap.ui.core.BusyIndicator.hide(); // Hide any busy indicator after success
        this.getView().byId("idNotesTxtArea").setValue(""); // Clear the text area
        MessageToast.show(oBundle.getText("SuccessfullyPostedNote")); // Show success message
        this.fetchNotes(this._packageId); // Refresh the notes after adding a new one
        return data;
      };

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        this.getView().byId("idNotesTxtArea").setValue(""); // Clear the text area
        console.log('Error occurred while posting the note: ', errorThrown); // Log the error
        sap.ui.core.BusyIndicator.hide(); // Hide any busy indicator after error
        MessageToast.show(oBundle.getText("ErrorPostingNote")); // Show error message
      };

      return this.executeRequest(sUrl, 'POST', JSON.stringify(obj), oSuccessFunction, oErrorFunction);
    },

    onClearNotes: function (oEvent) {
      this.getView().byId("idNotesTxtArea").setValue("");
    },

    fetchFileList: function (packageId) {
      var sURL = baseManifestUrl + `/odata/DOC_PACK?$filter=PackageId eq ${packageId}&$expand=Invoice($expand=body($expand=allegati))`,
        oDetailDetailModel = this.getView().getModel("detailDetailModel"),
        oCurrentInvoiceItalianTrace = this.getView().getModel("currentInvoiceItalianTrace"),
        oTable = this.getView().byId("idFileList");
      oTable.setBusy(true);

      const oSuccessFunction = (data) => {
        oDetailDetailModel.setProperty("/currentInvoice/Allegati", data.value[0].Invoice.body[0].allegati);
        // oCurrentInvoiceItalianTrace.setProperty("/body/0/allegati");
        oDetailDetailModel.refresh();
        oTable.setBusy(false);
        return data;
      };

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        console.log(errorThrown);  // Log the error
        oTable.setBusy(false);
      };

      return this.executeRequest(sURL, 'GET', null, oSuccessFunction, oErrorFunction);
    },

    // Handler to cancel the "edit" mode and unlock the document
    handleCancelGEdit: function () {
      var that = this;
      MessageBox.warning(oBundle.getText("AlertCancelEdit"), {
        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
        emphasizedAction: MessageBox.Action.NO,
        onClose: function (sAction) {
          if (sAction === MessageBox.Action.YES) {
            that._confirmCancelEdit().then(result => that._getData());
          }
        }
      });
    },

    _confirmCancelEdit: function () {
      var oDetailDetailModel = this.getView().getModel("detailDetailModel");  // Get the model for details
      var URL = baseManifestUrl + "/odata/unlock";  // API endpoint to unlock the document
      this.aRemovedSupplierInvoiceWhldgTaxRecords = [];
      this.aRemovedPoLineDetails = [];
      this.aRemovedGlAccountLineDetails = [];
      // Build the request payload
      var body = {
        payload: {
          PackageId: this._packageId  // Include the package ID for unlocking
        }
      };

      // Set the model properties to indicate that the edit mode is disabled
      oDetailDetailModel.setProperty("/props/gEditMode", false);
      oDetailDetailModel.setProperty("/props/lineItemTable/editMode", false);

      const oSuccessFunction = (data) => {
        console.log(data);  // Log the successful response

        // Set edit mode properties to false (document unlocked)
        oDetailDetailModel.setProperty("/props/gEditMode", false);
        oDetailDetailModel.setProperty("/props/lineItemTable/editMode", false);

        // Show a message to indicate the document has been unlocked
        MessageToast.show(oBundle.getText("DocumentUnlocked"));

        // this.rebindTable(this.oReadOnlyTemplate, "Navigation", true);
        this.getView().byId("idInvLineItemTable").setSelectionMode("None");  // Disable table actions
        // this.rebindTable(this.oReadOnlyGLAccountTemplateNPo, "Navigation", false);
        this.getView().byId("idNPOInvGLAccountLineTable").setSelectionMode("None");  // Disable table actions
        this.getView().byId("idSupplierInvoiceWhldgTaxTable").setSelectionMode("None");  // Disable table actions
        return data;
      };

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        console.log("FAILED TO REMOVE LOCK", XMLHttpRequest);  // Log the error

        // Show a message indicating failure to unlock
        MessageToast.show(oBundle.getText("UnableToUnlock"));
      };

      return this.executeRequest(URL, 'POST', JSON.stringify(body), oSuccessFunction, oErrorFunction);
    },

    handleGEdit: function () {
      this.getLockStatus(this._packageId).then(function (data) {
        if (data.value[0].result.locked) {
          MessageBox.warning(oBundle.getText("AlertEdit", data.value[0].result.lockedBy), {
            styleClass: sResponsivePaddingClasses
          });
        } else {
          this._editDocument();
        }
      }.bind(this));
    },

    _editDocument: function () {
      let body = {
        payload: {
          PackageId: this._packageId
        }
      };
      var sURL = baseManifestUrl + "/odata/lock";
      this.aRemovedSupplierInvoiceWhldgTaxRecords = [];
      this.aRemovedPoLineDetails = [];
      this.aRemovedGlAccountLineDetails = [];

      const oSuccessFunction = (data) => {
        // if success means lock was set
        console.log(data);

        var oDetailDetailModel = this.getView().getModel("detailDetailModel");
        oDetailDetailModel.setProperty("/props/gEditMode", true);
        oDetailDetailModel.setProperty("/props/lineItemTable/editMode", true);

        MessageToast.show(oBundle.getText("DocumentLocked"));

        this.getView().byId("idInvLineItemTable").setSelectionMode("MultiToggle");
        // this.rebindTable(this.oEditableTemplate, "Edit", true);
        this.getView().byId("idNPOInvGLAccountLineTable").setSelectionMode("MultiToggle");
        this.getView().byId("idSupplierInvoiceWhldgTaxTable").setSelectionMode("MultiToggle");
        // this.rebindTable(this.oEditableTemplateGLAccountNPo, "Edit", false);

        return data;
      };

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        console.log("FAILED TO SET LOCK", errorThrown);
        MessageBox.error(oBundle.getText("UnableToLockDocument"), {
          details: errorThrown,
          styleClass: sResponsivePaddingClasses
        });
      };

      return this.executeRequest(sURL, 'POST', JSON.stringify(body), oSuccessFunction, oErrorFunction);
    },

    // onEditInvLineItems: function (oEvent) {
    //   // this.aProductCollection = deepExtend([], this.oModel.getProperty("/DocxLines"));
    //   var oDetailDetailModel = this.getView().getModel("detailDetailModel");
    //   oDetailDetailModel.setProperty("/props/lineItemTable/editMode", oEvent.getParameter("pressed"));

    //   if (oEvent.getParameter("pressed")) {
    //     this.getView().byId("idInvLineItemTable").setMode("MultiSelect");
    //     this.rebindTable(this.oEditableTemplate, "Edit", true);
    //   } else {
    //     this.rebindTable(this.oReadOnlyTemplate, "Navigation", true);
    //     this.getView().byId("idInvLineItemTable").setMode("None");
    //   }
    // },

    onAddTo_SelectedPurchaseOrdersRow: function (oEvent) {
      var oDetailDetailModel = this.getView().getModel("detailDetailModel"),
        oCurrentInvoice = oDetailDetailModel.getProperty("/currentInvoice");
      // Retrieve the PORecords data from the model
      var aTo_SelectedPurchaseOrders = oDetailDetailModel.getProperty("/currentInvoice/To_SelectedPurchaseOrders");
      aTo_SelectedPurchaseOrders.push({
        "PurchaseOrder": null,
        "PurchaseOrderItem": null
      });
      oDetailDetailModel.setProperty("/currentInvoice/To_SelectedPurchaseOrders", aTo_SelectedPurchaseOrders);
    },

    onAddTo_SelectedDeliveryNotesRow: function (oEvent) {
      var oDetailDetailModel = this.getView().getModel("detailDetailModel"),
        oCurrentInvoice = oDetailDetailModel.getProperty("/currentInvoice");
      // Retrieve the PORecords data from the model
      var aTo_SelectedDeliveryNotes = oDetailDetailModel.getProperty("/currentInvoice/To_SelectedDeliveryNotes");
      aTo_SelectedDeliveryNotes.push({
        "InboundDeliveryNote": null
      });
      oDetailDetailModel.setProperty("/currentInvoice/To_SelectedDeliveryNotes", aTo_SelectedDeliveryNotes);
    },

    onAddTo_SelectedServiceEntrySheetsRow: function (oEvent) {
      var oDetailDetailModel = this.getView().getModel("detailDetailModel"),
        oCurrentInvoice = oDetailDetailModel.getProperty("/currentInvoice");
      // Retrieve the PORecords data from the model
      var aTo_SelectedServiceEntrySheets = oDetailDetailModel.getProperty("/currentInvoice/To_SelectedServiceEntrySheets");
      aTo_SelectedServiceEntrySheets.push({
        "ServiceEntrySheet": null,
        "ServiceEntrySheetItem": null
      });
      oDetailDetailModel.setProperty("/currentInvoice/To_SelectedServiceEntrySheets", aTo_SelectedServiceEntrySheets);
    },

    _getDefaultWithholdingTaxValues: function (sInvoicingParty) {
      var aURL = baseManifestUrl + "/odata/getWithholdingTax()?Supplier=" + sInvoicingParty;
      this.getView().byId('DDPage').setBusy(true);

      const oSuccessFunction = (data) => {
        this.getView().byId('DDPage').setBusy(false);
        return data.value[0].result[0];
      }

      const oErrorFunction = (data) => {
        this.getView().byId('DDPage').setBusy(false);
      }
      return this.executeRequest(aURL, 'GET', null, oSuccessFunction, oErrorFunction);
    },

    onAddSupplierInvoiceWhldgTaxRow: async function (oEvent) {
      var oDetailDetailModel = this.getView().getModel("detailDetailModel"),
        oCurrentInvoice = oDetailDetailModel.getProperty("/currentInvoice"),
        sInvoicingParty = oCurrentInvoice.InvoicingParty,
        oWhldgValues = null,
        sHeader_Id_InvoiceIntegrationInfo = oCurrentInvoice.header_Id_InvoiceIntegrationInfo;

      if (sInvoicingParty && sInvoicingParty !== '') {
        oWhldgValues = await this._getDefaultWithholdingTaxValues(sInvoicingParty)
      }
      // Retrieve the PORecords data from the model
      var aTo_SupplierInvoiceWhldgTax = oDetailDetailModel.getProperty("/currentInvoice/To_SupplierInvoiceWhldgTax");
      aTo_SupplierInvoiceWhldgTax.push({
        "supplierInvoiceWhldgTax_Id": null,
        "header_Id_InvoiceIntegrationInfo": sHeader_Id_InvoiceIntegrationInfo,
        "WithholdingTaxType": oWhldgValues ? oWhldgValues.WithholdingTaxType : null,
        "WithholdingTaxCode": oWhldgValues ? oWhldgValues.WithholdingTaxCode : null,
        "WithholdingTaxBaseAmount": null,
        "WhldgTaxBaseIsEnteredManually": null
      });
      oDetailDetailModel.setProperty("/currentInvoice/To_SupplierInvoiceWhldgTax", aTo_SupplierInvoiceWhldgTax);
    },

    onWithholdingTaxTypeVH: function (oEvent) {
      this.oInputWithholdingTaxType = oEvent.getSource();
      var oView = this.getView();
      var aURL = baseManifestUrl + "/odata/getWithholdingTaxesType()";
      var oDetailDetailModel = this.getView().getModel("detailDetailModel");
      this.getView().byId('DDPage').setBusy(true);

      const oSuccessFunction = (data) => {
        oDetailDetailModel.setProperty("/valuehelps/withholdingTaxesType", data.value[0].result)
        this.getView().byId('DDPage').setBusy(false);
        if (!this.getView().byId("idWhldgTaxTypeDialog_VH")) {
          Fragment.load({
            id: oView.getId(),
            name: "vim_ui.view.fragments.WhldgTaxTypeVH",
            controller: this
          }).then(function (oDialog) {
            oView.addDependent(oDialog);
            oDialog.open();
          });
        } else {
          this.getView().byId("idWhldgTaxTypeDialog_VH").open();
        }
      }

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        this.getView().byId('DDPage').setBusy(false);
        let sMsg = oBundle.getText("UnexpectedErrorOccurred");
        MessageToast.show(sMsg);
        console.log(errorThrown);
      };

      return this.executeRequest(aURL, 'GET', null, oSuccessFunction, oErrorFunction);
    },

    onSearchWhldgTaxType: function (oEvent) {
      var sValue = oEvent.getParameter("value");
      if (sValue) {
        var sFilter = new Filter({
          filters: [
            new Filter("WithholdingTaxType", FilterOperator.Contains, sValue)
          ]
        });
      }
      var oList = this.getView().byId("idWhldgTaxTypeDialog_VH");
      var oBinding = oList.getBinding("items");
      oBinding.filter(sFilter);
    },


    onConfirmWhldgTaxType: function (oEvent) {
      var sPath = oEvent.getParameter("selectedItem").getBindingContextPath("detailDetailModel");
      var sWithholdingTaxType = this.getView().getModel("detailDetailModel").getProperty(sPath + "/WithholdingTaxType");
      this.oInputWithholdingTaxType.setValue(sWithholdingTaxType);
      this.oInputWithholdingTaxType.fireChangeEvent(sWithholdingTaxType);
    },

    onWithholdingTaxCodeVH: function (oEvent) {
      this.oInputWithholdingTaxCode = oEvent.getSource();
      var oView = this.getView();
      var aURL = baseManifestUrl + "/odata/getWithholdingTaxesCode()";
      var oDetailDetailModel = this.getView().getModel("detailDetailModel");
      this.getView().byId('DDPage').setBusy(true);

      const oSuccessFunction = (data) => {
        oDetailDetailModel.setProperty("/valuehelps/withholdingTaxesCode", data.value[0].result)
        this.getView().byId('DDPage').setBusy(false);
        if (!this.getView().byId("idWhldgTaxCodeDialog_VH")) {
          Fragment.load({
            id: oView.getId(),
            name: "vim_ui.view.fragments.WhldgTaxCodeVH",
            controller: this
          }).then(function (oDialog) {
            oView.addDependent(oDialog);
            oDialog.open();
          });
        } else {
          this.getView().byId("idWhldgTaxCodeDialog_VH").open();
        }
      }

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        this.getView().byId('DDPage').setBusy(false);
        let sMsg = oBundle.getText("UnexpectedErrorOccurred");
        MessageToast.show(sMsg);
        console.log(errorThrown);
      };

      return this.executeRequest(aURL, 'GET', null, oSuccessFunction, oErrorFunction);
    },

    onSearchWhldgTaxName: function (oEvent) {
      var sValue = oEvent.getParameter("value");
      if (sValue) {
        var sFilter = new Filter({
          filters: [
            new Filter("WithholdingTaxCode", FilterOperator.Contains, sValue)
          ]
        });
      }
      var oList = this.getView().byId("idWhldgTaxCodeDialog_VH");
      var oBinding = oList.getBinding("items");
      oBinding.filter(sFilter);
    },


    onConfirmWhldgTaxCode: function (oEvent) {
      var sPath = oEvent.getParameter("selectedItem").getBindingContextPath("detailDetailModel");
      var sWithholdingTaxCode = this.getView().getModel("detailDetailModel").getProperty(sPath + "/WithholdingTaxCode");
      this.oInputWithholdingTaxCode.setValue(sWithholdingTaxCode);
      this.oInputWithholdingTaxCode.fireChangeEvent(sWithholdingTaxCode);
    },

    _addPORow: function (oData) {
      var oDetailDetailModel = this.getView().getModel("detailDetailModel"),
        oCurrentInvoice = oDetailDetailModel.getProperty("/currentInvoice"),
        sBodyInvoiceItalianTrace_Id = oCurrentInvoice.PORecords.length > 0 ? oCurrentInvoice.PORecords[0].bodyInvoiceItalianTrace_Id : oCurrentInvoice.GLAccountRecords[0].bodyInvoiceItalianTrace_Id;
      // Retrieve the PORecords data from the model
      var aPORecords = oDetailDetailModel.getProperty("/currentInvoice/PORecords");
      aPORecords.unshift({
        "lineDetail_ID": null,
        "bodyInvoiceItalianTrace_Id": sBodyInvoiceItalianTrace_Id,
        "bodyPOIntegrationInfo_Id": null,
        "SupplierInvoiceItem": null,
        "PurchaseOrder": oData? oData.PurchaseOrder : null,
        "PurchaseOrderItem": oData? oData.PurchaseOrderItem : null,
        "ReferenceDocument": oData? oData.ReferenceDocument : null,
        "ReferenceDocumentFiscalYear": oData? oData.ReferenceDocumentFiscalYear : null,
        "ReferenceDocumentItem": oData? oData.ReferenceDocumentItem : null,
        "Plant": oData? oData.Plant : null,
        "IsSubsequentDebitCredit": this.getValueMappedToIsSubsequentDebitCredit(),
        "TaxCode": oData? oData.TaxCode : null,
        "DocumentCurrency": this.getValueMappedToDocumentCurrency(),
        "SupplierInvoiceItemAmount": oData? oData.SupplierInvoiceItemAmount : null,
        "PurchaseOrderQuantityUnit": oData? oData.PurchaseOrderQuantityUnit : null,
        "QuantityInPurchaseOrderUnit": oData? oData.QuantityInPurchaseOrderUnit : null,
        "QtyInPurchaseOrderPriceUnit": null,
        "PurchaseOrderPriceUnit": null,
        "SupplierInvoiceItemText": null,
        "IsNotCashDiscountLiable": null,
        "ServiceEntrySheet": oData? oData.ServiceEntrySheet : null,
        "ServiceEntrySheetItem": oData? oData.ServiceEntrySheetItem : null,
        "IsFinallyInvoiced": oData? oData.IsFinallyInvoiced : null,
        "CostCenter": oData? oData.CostCenter : null,
        "TaxDeterminationDate": null,
        "ControllingArea": oData? oData.ControllingArea : null,
        "BusinessArea": oData? oData.BusinessArea : null,
        "ProfitCenter": oData? oData.ProfitCenter : null,
        "FunctionalArea": oData? oData.FunctionalArea : null,
        "InternalOrder": oData? oData.InternalOrder : null,
        "SalesOrder": oData? oData.SalesOrder : null,
        "SalesOrderItem": oData? oData.SalesOrderItem : null,
        "CommitmentItem": oData? oData.CommitmentItem : null,
        "FundsCenter": oData? oData.FundsCenter : null,
        "Fund": oData? oData.Fund : null,
        "GrantID": oData? oData.GrantID : null,
        "ProfitabilitySegment": oData? oData.ProfitabilitySegment : null,
        "BudgetPeriod": oData? oData.BudgetPeriod : null,
        "WBSElement": oData? oData.WBSElem : null,
        "AccountAssignmentNumber": oData? oData.AccountAssignmentNumber : null
      });
      oDetailDetailModel.setProperty("/currentInvoice/PORecords", aPORecords);
    },

    onAddPORow: function (oEvent) {
      this._addPORow();
    },

    onAddGLAccountRow: function (oEvent) {
      var oDetailDetailModel = this.getView().getModel("detailDetailModel"),
        oCurrentInvoice = oDetailDetailModel.getProperty("/currentInvoice"),
        sBodyInvoiceItalianTrace_Id = oCurrentInvoice.PORecords.length > 0 ? oCurrentInvoice.PORecords[0].bodyInvoiceItalianTrace_Id : oCurrentInvoice.GLAccountRecords[0].bodyInvoiceItalianTrace_Id;

      // Retrieve the GLAccountRecords data from the model
      var aGLAccountRecords = oDetailDetailModel.getProperty("/currentInvoice/GLAccountRecords");
      aGLAccountRecords.unshift({
        "lineDetail_ID": null,
        "bodyInvoiceItalianTrace_Id": sBodyInvoiceItalianTrace_Id,
        "bodyGLAccountIntegrationInfo_Id": null,
        "SupplierInvoiceItem": null,
        "CompanyCode": null,
        "GLAccount": null,
        "DebitCreditCode": this.getValueMappedToIsSubsequentDebitCredit(),
        "DocumentCurrency": this.getValueMappedToDocumentCurrency(),
        "SupplierInvoiceItemAmount": null,
        "TaxCode": null,
        "AssignmentReference": null,
        "SupplierInvoiceItemText": null,
        "CostCenter": null,
        "BusinessArea": null,
        "PartnerBusinessArea": null,
        "ProfitCenter": null,
        "FunctionalArea": null,
        "SalesOrder": null,
        "SalesOrderItem": null,
        "CostCtrActivityType": null,
        "WBSElement": null,
        "PersonnelNumber": null,
        "IsNotCashDiscountLiable": null,
        "InternalOrder": null,
        "CommitmentItem": null,
        "Fund": null,
        "GrantID": null,
        "QuantityUnit": null,
        "Quantity": null,
        "FinancialTransactionType": null,
        "EarmarkedFundsDocument": null,
        "EarmarkedFundsDocumentItem": null,
        "BudgetPeriod": null
      });
      oDetailDetailModel.setProperty("/currentInvoice/GLAccountRecords", aGLAccountRecords);
    },

    onDeleteSelectedPORows: function () {
      this._handleRemovedLineDetailCache("idInvLineItemTable");
      this._onDeleteSelectedRows("idInvLineItemTable", "/currentInvoice/PORecords");
      this.onSelectionPOChange();
    },

    onSelectionTo_SelectedPurchaseOrdersChange: function () {
      this._enableDeleteButton("idTo_SelectedPurchaseOrdersTable", "deleteTo_SelectedPurchaseOrdersTable");
    },


    onSelectionTo_SelectedDeliveryNotesChange: function () {
      this._enableDeleteButton("idTo_SelectedDeliveryNotesTable", "deleteTo_SelectedDeliveryNotesTable");
    },


    onSelectionTo_SelectedServiceEntrySheetsChange: function () {
      this._enableDeleteButton("idTo_SelectedServiceEntrySheetsTable", "deleteTo_SelectedServiceEntrySheetsTable");
    },


    onSelectionSupplierInvoiceWhldgTaxChange: function () {
      this._enableDeleteButton("idSupplierInvoiceWhldgTaxTable", "deleteSupplierInvoiceWhldgTaxTable");
    },

    onSelectionPOChange: function () {
      this._enableDeleteButton("idInvLineItemTable", "deleteRowFromPOLineTable");
    },

    onSelectionGLAccountChange: function () {
      this._enableDeleteButton("idNPOInvGLAccountLineTable", "deleteRowFromGLAccountLineTable");
    },

    _enableDeleteButton: function (sTableId, sDeleteButtonId) {
      var oTable = this.getView().byId(sTableId),
        aIndices = oTable.getSelectedIndices(),
        bEnableDeleteButton = aIndices.length > 0;
      this.getView().byId(sDeleteButtonId).setEnabled(bEnableDeleteButton);
    },

    _onDeleteSelectedRows: function (sTableId, sPropertyLine) {
      var oDetailDetailModel = this.getView().getModel("detailDetailModel"),
        oTable = this.getView().byId(sTableId),
        aSelectedIndices = oTable.getSelectedIndices(),
        selectedContexts = aSelectedIndices.map(iIndex => oTable.getContextByIndex(iIndex)),
        oBinding = oTable.getBinding("rows"),
        aBindingContext = oBinding.getContexts(0, oBinding.getLength());

      let a = new Set(aBindingContext);
      let b = new Set(selectedContexts);
      let diff = new Set([...a].filter(x => !b.has(x)));

      var aDiff = [...diff];

      var values = aDiff.map((ctx, index) => {
        // ctx.getObject().InvoiceLineItem = index + 1;
        return ctx.getObject();
      });

      oDetailDetailModel.setProperty(sPropertyLine, values);
    },

    /**
     * Store line detail to be removed depening from lineDetail_ID and sTableId.
     * If lineDetail_ID is null then record is new so it doesn't exist into the DB entities
     * and there is no need to insert it into the aRemovedLineDetailCache.
     */
    _handleRemovedLineDetailCache: function (sTableId) {
      var oDetailDetailModel = this.getView().getModel("detailDetailModel"),
        oTable = this.getView().byId(sTableId),
        aSelectedIndices = oTable.getSelectedIndices(),
        selectedContexts = aSelectedIndices.map(iIndex => oTable.getContextByIndex(iIndex));

      switch (sTableId) {
        case "idInvLineItemTable":
          this.aRemovedPoLineDetails = selectedContexts.map(oContext => {
            let sLineDetail_ID = oDetailDetailModel.getProperty(oContext.sPath + "/lineDetail_ID");
            let sBodyPOIntegrationInfo_Id = oDetailDetailModel.getProperty(oContext.sPath + "/bodyPOIntegrationInfo_Id");
            if (sLineDetail_ID) {
              return { "lineDetail_ID": sLineDetail_ID, "bodyPOIntegrationInfo_Id": sBodyPOIntegrationInfo_Id };
            }

          });
          // remove inconsistent object if any
          this.aRemovedPoLineDetails = this.aRemovedPoLineDetails.filter(item => item && item.lineDetail_ID !== null && item.lineDetail_ID !== '' && item.bodyPOIntegrationInfo_Id !== null && item.bodyPOIntegrationInfo_Id !== '');
          break;
        case "idNPOInvGLAccountLineTable":
          this.aRemovedGlAccountLineDetails = selectedContexts.map(oContext => {
            let sLineDetail_ID = oDetailDetailModel.getProperty(oContext.sPath + "/lineDetail_ID");
            let sBodyGLAccountIntegrationInfo_Id = oDetailDetailModel.getProperty(oContext.sPath + "/bodyGLAccountIntegrationInfo_Id");
            if (sLineDetail_ID) {
              return { "lineDetail_ID": sLineDetail_ID, "bodyGLAccountIntegrationInfo_Id": sBodyGLAccountIntegrationInfo_Id };
            }
          });
          // remove inconsistent object if any
          this.aRemovedGlAccountLineDetails = this.aRemovedGlAccountLineDetails.filter(item => item && item.lineDetail_ID !== null && item.lineDetail_ID !== '' && item.bodyGLAccountIntegrationInfo_Id !== null && item.bodyGLAccountIntegrationInfo_Id !== '');
          break;
        default:
          this.aRemovedSupplierInvoiceWhldgTaxRecords = selectedContexts.map(oContext => {
            let sSupplierInvoiceWhldgTax_Id = oDetailDetailModel.getProperty(oContext.sPath + "/supplierInvoiceWhldgTax_Id");
            if (sSupplierInvoiceWhldgTax_Id) {
              return { "supplierInvoiceWhldgTax_Id": sSupplierInvoiceWhldgTax_Id };
            }
          });
          // remove inconsistent object if any
          this.aRemovedSupplierInvoiceWhldgTaxRecords = this.aRemovedSupplierInvoiceWhldgTaxRecords.filter(item => item && item.supplierInvoiceWhldgTax_Id !== null && item.supplierInvoiceWhldgTax_Id !== '');
      }
    },

    onDeleteSelectedGLAccountRows: function () {
      this._handleRemovedLineDetailCache("idNPOInvGLAccountLineTable");
      this._onDeleteSelectedRows("idNPOInvGLAccountLineTable", "/currentInvoice/GLAccountRecords");
      this.onSelectionGLAccountChange();
    },

    onDeleteTo_SelectedPurchaseOrdersRows: function () {
      this._onDeleteSelectedRows("idTo_SelectedPurchaseOrdersTable", "/currentInvoice/To_SelectedPurchaseOrders");
      // this.onSelectionTo_SelectedPurchaseOrdersChange();
    },

    onDeleteTo_SelectedDeliveryNotesRows: function () {
      var oTable = this.getView().byId("idTo_SelectedDeliveryNotesTable"),
      aSelectedIndices = oTable.getSelectedIndices();
      aNewSelectedDeliveryNotesRecords = aNewSelectedDeliveryNotesRecords.filter((_, index) => !aSelectedIndices.includes(index));
      this.getView().getModel("detailDetailModel").setProperty("/currentInvoice/To_SelectedDeliveryNotes", aNewSelectedDeliveryNotesRecords);
    },

    onDeleteTo_SelectedServiceEntrySheetsRows: function () {
      var oTable = this.getView().byId("idTo_SelectedServiceEntrySheetsTable"),
      aSelectedIndices = oTable.getSelectedIndices();
      aNewSelectedServiceEntrySheetsRecords = aNewSelectedServiceEntrySheetsRecords.filter((_, index) => !aSelectedIndices.includes(index));
      this.getView().getModel("detailDetailModel").setProperty("/currentInvoice/To_SelectedServiceEntrySheets", aNewSelectedServiceEntrySheetsRecords);
    },

    onDeleteSelectedSupplierInvoiceWhldgTaxRows: function () {
      this._handleRemovedLineDetailCache("idSupplierInvoiceWhldgTaxTable");
      this._onDeleteSelectedRows("idSupplierInvoiceWhldgTaxTable", "/currentInvoice/To_SupplierInvoiceWhldgTax");
      this.onSelectionSupplierInvoiceWhldgTaxChange();
    },

    handleAboutPress: function () {
      var oNextUIState = this.getOwnerComponent().getHelper().getNextUIState(3);
      this.oRouter.navTo("page2", { layout: oNextUIState.layout });
    },

    handleFullScreen: function () {
      var oModel = this.getOwnerComponent().getModel();
      oModel.setProperty("/layout", 'MidColumnFullScreen');

      this.bFocusFullScreenButton = true;

      var oModel = this.getOwnerComponent().getModel();
      var oUIState = this.getOwnerComponent().getHelper().getCurrentUIState();
      oModel.setData(oUIState);
      // MidColumnFullScreen
      // var sNextLayout = this.oModel.getProperty("/actionButtonsInfo/midColumn/fullScreen");
      // this.oRouter.navTo("detailDetail", { layout: sNextLayout, packageId: this._packageId });
    },

    handleExitFullScreen: function () {
      var oModel = this.getOwnerComponent().getModel();
      oModel.setProperty("/layout", 'TwoColumnsMidExpanded');

      this.bFocusFullScreenButton = true;

      var oModel = this.getOwnerComponent().getModel();
      var oUIState = this.getOwnerComponent().getHelper().getCurrentUIState();
      oModel.setData(oUIState);
      // var sNextLayout = this.oModel.getProperty("/actionButtonsInfo/midColumn/exitFullScreen");
      // this.oRouter.navTo("detailDetail", { layout: sNextLayout, packageId: this._packageId });
    },

    handleClose: function () {
      var sNextLayout = this.oModel.getProperty("/actionButtonsInfo/midColumn/closeColumn");
      this.oRouter.navTo("detail", { layout: sNextLayout, product: this._product });
    },

    loadHeaderFromDB: function (packageId) {
      if (!packageId) {
        console.log("packageId not passed");
        return null;
      }
      var sUrl = baseManifestUrl + "/odata/extended()?PACKAGEID=" + packageId + "";

      const oSuccessFunction = (oData) => {
        var data = oData.value[0].result.pop();
        var oDetailDetailModel = this.getView().getModel("detailDetailModel");
        oDetailDetailModel.setProperty("/detail/header", data);
        return oData;
      };

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        console.log(errorThrown);
      };

      return this.executeRequest(sUrl, 'GET', null, oSuccessFunction, oErrorFunction);
    },


    /* Helpers */

    convertToPattern: function (sValue) {

      if (sValue) {

        sValue = sValue.substring(0, 19);
        sValue = sValue.trim();

        var aStrings = sValue.split(" ");
        sValue = aStrings.join("*");
        sValue = "*" + sValue + "*";

        return sValue;
      }
      return null;
    },

    /* Value Helps Block */
    /* Currency */
    fetchCurrency: function (code) {
      var aURL = baseManifestUrl + "/odata/currency()";
      if (code) {
        aURL = aURL + "?code=" + code + "";
      }

      const oSuccessFunction = (data) => {
        return data.value[0].result;
      };

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        console.log(errorThrown);
      };

      return this.executeRequest(aURL, 'GET', null, oSuccessFunction, oErrorFunction);
    },

    /* Document Type */
    onInvDocTypeVH: function (oEvent) {
      this.oInput = oEvent.getSource();
      var oView = this.getView();
      var type;
      if (this.appmodel.getProperty("/props/POMode")) {
        type = "PO";
      } else {
        type = "NONPO";
      }

      //create dialog
      if (!this.getView().byId("invdoctypDialog")) {
        //load asynchronous fragment (XML)
        Fragment.load({
          id: oView.getId(),
          name: "vim_ui.view.fragments.InvDocTyp",
          controller: this
        }).then(function (oDialog) {
          //connect Menu to rootview of this component (models, lifecycle)
          oView.addDependent(oDialog);
          oDialog.open();

          // var oBinding = oDialog.getBinding("items");
          // // build filter array
          // var aFilter = [];
          // aFilter.push(new Filter("Paramtype", FilterOperator.EQ, "AP_APP"));
          // aFilter.push(new Filter("Subtype", FilterOperator.EQ, "VH"));
          // aFilter.push(new Filter("Key2", FilterOperator.EQ, type));
          // oBinding.filter(aFilter);
        });
      } else {
        this.getView().byId("invdoctypDialog").open();

        // var oBinding = this.getView().byId("invdoctypDialog").getBinding("items");
        // // build filter array
        // var aFilter = [];
        // aFilter.push(new Filter("Paramtype", FilterOperator.EQ, "AP_APP"));
        // aFilter.push(new Filter("Subtype", FilterOperator.EQ, "VH"));
        // aFilter.push(new Filter("Key2", FilterOperator.EQ, type));
        // oBinding.filter(aFilter);
      }
    },


    onSearchDocTyp: function (oEvent) {
      var sTerm = oEvent.getParameter('value');

      // build filter array
      var aFilter = [];
      if (sTerm) {
        aFilter.push(new Filter("AccountingDocumentType", FilterOperator.Contains, sTerm));
      }

      // filter binding
      var oList = this.getView().byId("invdoctypDialog");
      var oBinding = oList.getBinding("items");
      oBinding.filter(aFilter);

    },

    onConfirmDocTyp: function (oEvent) {
      var sValue = oEvent.getParameter("selectedItem").getTitle();
      this.getView().byId("invdoctypDialog").getBinding("items").filter([]);
      this.oInput.setValue(sValue);
    },

    onVHCurrency: function (oEvent) {
      this.oInput = oEvent.getSource();
      var oView = this.getView();
      //create dialog
      if (!this.getView().byId("currencyDialog")) {
        //load asynchronous fragment (XML)
        Fragment.load({
          id: oView.getId(),
          name: "vim_ui.view.fragments.Currency",
          controller: this
        }).then(function (oDialog) {
          //connect Menu to rootview of this component (models, lifecycle)
          oView.addDependent(oDialog);
          oDialog.open();
        });
      } else {
        this.getView().byId("currencyDialog").open();
      }
    },

    onSearchCurrency: function (oEvent) {
      var sTerm = oEvent.getParameter('value');

      // build filter array
      var aFilter = [];
      if (sTerm) {
        aFilter.push(new Filter("code", FilterOperator.Contains, sTerm));
      }

      // filter binding
      var oList = this.getView().byId("currencyDialog");
      var oBinding = oList.getBinding("items");
      oBinding.filter(aFilter);

    },

    onConfirmCurrency: function (oEvent) {
      var sCurr = oEvent.getParameter("selectedItem").getTitle();
      //this.getView().getModel("appmodel").setProperty("/detailDetail/header/currencyCode/value", sCurr);
      this.appmodel.setProperty("/detailDetail/header/currencyCode/value", sCurr);
      this.oInput.setValue(sCurr);

    },

    onCancelCurrency: function (oEvent) {
      // filter binding
      var oList = this.getView().byId("currencyDialog");
      var oBinding = oList.getBinding("items");
      oBinding.filter([]);
      this.oInput.setValue("");
    },

    /* Vendor */
    onVendorVH: function (oEvent) {
      this.oInput = oEvent.getSource();
      var oView = this.getView();
      var sTerm = oView.byId("idSenderName").getValue();

      //sTerm = this.convertToPattern(sTerm);

      var oModel = this.getOwnerComponent().getModel("VendorModel");

      function bindList(oDialog, oModel, oView) {
        oDialog.setModel(oModel);
        oDialog.bindAggregation("items", {
          path: "/C_SupplierFs",//vendorSet
          // filters: new Filter("Name1", FilterOperator.EQ, sTerm),
          template: new sap.m.StandardListItem({
            title: "{Supplier}",//Lifnr
            description: "{SupplierName}"//Name1
          })
        });

        oView.getModel("VendorModel").refresh();
      }
      //create dialog
      if (!this.getView().byId("vendorDialog")) {
        //load asynchronous fragment (XML)
        Fragment.load({
          id: oView.getId(),
          name: "vim_ui.view.fragments.Vendor",
          controller: this
        }).then(function (oDialog) {
          //connect Menu to rootview of this component (models, lifecycle)
          oView.addDependent(oDialog);

          bindList(oDialog, oModel, oView);
          if (sTerm) {
            oDialog.getBinding("items").filter(new Filter("SupplierName", FilterOperator.EQ, sTerm));
          }
          oDialog.open();
        });
      } else {
        var oDialog = this.getView().byId("vendorDialog");
        bindList(oDialog, oModel, oView);
        if (sTerm) {
          oDialog.getBinding("items").filter(new Filter("SupplierName", FilterOperator.EQ, sTerm));
        }
        oDialog.open();
      }
    },

    onVendorChange: function (oEvent) {
      var sLifnr = oEvent.getParameter('value');
      //var sTerm = this.convertToPattern(sLifnr);
      var sTerm = sLifnr;
      var oModel = this.getOwnerComponent().getModel("VendorModel");
      var oApProcessModel = this.getOwnerComponent().getModel("ApProcessModel");
      oModel.refresh();

      oModel.read("/C_SupplierFs", {
        filters: [new Filter("SupplierName", FilterOperator.EQ, sTerm)],
        success: function (oData) {
          this.getView().byId("idSenderName").setValue(oData.results[0].Name1);
        }.bind(this),
        error: function (oErr) {
          console.log('vendor error', oErr);
        }
      });

      this.bindBankKey(this.getView(), oApProcessModel, null, sLifnr);

    },

    onSearchVendor: function (oEvent) {
      var oDialog = this.getView().byId("vendorDialog");
      var sTerm = oEvent.getParameter('value');

      //sTerm = this.convertToPattern(sTerm);

      // build filter array
      var aFilter = [];
      if (sTerm) {
        aFilter.push(new Filter("SupplierName", FilterOperator.EQ, sTerm));
      }

      // filter binding
      var oBinding = oDialog.getBinding("items");
      oBinding.filter(aFilter);

    },

    onConfirmVendor: function (oEvent) {
      var sLifnr = oEvent.getParameter("selectedItem").getTitle();
      var sLifnrTxt = oEvent.getParameter("selectedItem").getDescription();
      this.oInput.setValue(sLifnr);
      this.appmodel.setProperty("/detailDetail/header/senderName/value", sLifnrTxt);
      // var oModel = this.getOwnerComponent().getModel("APModel"); CAP refactory - useless model
      var oApProcessModel = this.getOwnerComponent().getModel("ApProcessModel");

      this.bindBankKey(this.getView(), oApProcessModel, null, sLifnr);
      // oModel.refresh(); CAP refactory - useless operation
    },

    onCancelVendor: function (oEvent) {
      // filter binding
      var oList = this.getView().byId("vendorDialog");
      var oBinding = oList.getBinding("items");
      oBinding.filter([]);
      this.oInput.setValue("");
    },

    /* Company Code */
    // CAP refactory - useless function
    // onCompCodeChange: function (oEvent) {
    //   if (this.flag && this.flag === 'item') {
    //     var sBukrs = oEvent.getParameter('value');
    //     // this.oInput.setValue(sBukrs);
    //     var oModel = this.getOwnerComponent().getModel("APModel")

    //     this.flag = null;
    //     oModel.refresh();

    //   } else {
    //     var sBukrs = oEvent.getParameter('value');
    //     // this.oInput.setValue(sBukrs);
    //     var oModel = this.getOwnerComponent().getModel("APModel"),
    //       oApProcessModel = this.getOwnerComponent().getModel("ApProcessModel");
    //     oModel.refresh();

    //     oModel.read("/companycodeSet", {
    //       filters: [new Filter("Name", FilterOperator.EQ, sBukrs)],
    //       success: function (oData) {
    //         this.getView().byId("idReceiverName").setValue(oData.results[0].Name);
    //       }.bind(this),
    //       error: function (oErr) {
    //         console.log('companycode error', oErr);
    //       }
    //     });

    //     this.bindTaxCode(this.getView(), oApProcessModel, null, sBukrs);

    //     // set this comp-code to all line items
    //     var oNonPOLines = this.appmodel.getProperty("/NonPoDocxLines");

    //     // Non PO Based
    //     oNonPOLines = oNonPOLines.map(function (obj) {
    //       obj.Bukrs = sBukrs;

    //       return obj;
    //     });
    //     this.appmodel.setProperty("/NonPoDocxLines", oNonPOLines);

    //   }
    // },

    onCompCodeVH: function (oEvent) {
      this.oInput = oEvent.getSource();
      var oView = this.getView();
      var sTerm = oView.byId("idReceiverName").getValue();
      var aFilter = [];

      if (sTerm.trim().length === 0) {
        // Dont send the Name filter
        aFilter = [];
      } else {
        //sTerm = this.convertToPattern(sTerm);
        aFilter.push(new Filter("CompanyCodeName", FilterOperator.Contains, sTerm))
      }

      var oModel = this.getOwnerComponent().getModel("CompCodeModel");

      function bindList(oDialog, oModel, oView) {
        oDialog.setModel(oModel);
        oDialog.bindAggregation("items", {
          path: "/A_CompanyCode", //companycodeSet
          filters: aFilter,
          template: new sap.m.StandardListItem({
            title: "{CompanyCode}",
            description: "{CompanyCodeName}"
          })
        });

        oView.getModel("CompCodeModel").refresh();
      }
      //create dialog
      if (!this.getView().byId("compcodeDialog")) {
        //load asynchronous fragment (XML)
        Fragment.load({
          id: oView.getId(),
          name: "vim_ui.view.fragments.CompCode",
          controller: this
        }).then(function (oDialog) {
          //connect Menu to rootview of this component (models, lifecycle)
          oView.addDependent(oDialog);
          bindList(oDialog, oModel, oView);
          oDialog.open();
        });
      } else {
        var oDialog = this.getView().byId("compcodeDialog");
        bindList(oDialog, oModel, oView);
        oDialog.open();
      }
    },

    onSearchCompCode: function (oEvent) {
      var oView = this.getView();
      //var oModel = oView.getModel("APModel");
      var oModel = oView.getModel("CompCodeModel");

      var oDialog = oView.byId("compcodeDialog");
      var sTerm = oEvent.getParameter('value');

      //sTerm = this.convertToPattern(sTerm);

      // build filter array
      var aFilter = [];
      if (sTerm) {
        aFilter.push(new Filter("CompanyCodeName", FilterOperator.Contains, sTerm));
      }

      function bindList(oDialog, oModel, oView) {
        oDialog.setModel(oModel);
        oDialog.bindAggregation("items", {
          path: "/A_CompanyCode",//"/companycodeSet",
          template: new sap.m.StandardListItem({
            title: "{CompanyCode}",
            description: "{CompanyCodeName}"
          }),
          filters: aFilter
        });

        // oView.getModel("APModel").refresh(); CAP refactory - useless instruction
      }

      bindList(oDialog, oModel, oView);

      // filter binding
      // var oBinding = oDialog.getBinding("items");
      // oBinding.filter(aFilter);

    },

    onConfirmCompCode: function (oEvent) {

      if (this.flag && this.flag === 'item') {
        var sBukrs = oEvent.getParameter("selectedItem").getTitle();
        this.oInput.setValue(sBukrs);
        var oModel = this.getOwnerComponent().getModel("CompCodeModel")
        this.flag = null;
        oModel.refresh();

      } else {

        var sBukrs = oEvent.getParameter("selectedItem").getTitle();
        var sBukrsTxt = oEvent.getParameter("selectedItem").getDescription();
        this.oInput.setValue(sBukrs);
        this.appmodel.setProperty("/detailDetail/header/receiverName/value", sBukrsTxt);
        var oModel = this.getOwnerComponent().getModel("CompCodeModel"),
          oApProcessModel = this.getOwnerComponent().getModel("ApProcessModel");
        oModel.refresh();

        this.bindTaxCode(this.getView(), oApProcessModel, null, sBukrs);

        // set this comp-code to all line items
        var oNonPOLines = this.appmodel.getProperty("/NonPoDocxLines");

        // Non PO Based
        oNonPOLines = oNonPOLines.map(function (obj) {
          obj.Bukrs = sBukrs;

          return obj;
        });
        this.appmodel.setProperty("/NonPoDocxLines", oNonPOLines);

      }
    },

    onCancelCompCode: function (oEvent) {
      // filter binding
      var oList = this.getView().byId("compcodeDialog");
      var oBinding = oList.getBinding("items");
      oBinding.filter([]);
      this.oInput.setValue("");
    },

    /* Purchase Order */

    onPurchOrderVH: function (oEvent) {
      var oView = this.getView(),
        oModel = this.getOwnerComponent().getModel("PurchaseOrderModel"),
        bMultiplePO = this.appmodel.getProperty("/detailDetail/header/bMultiplePO"),
        Ebeln;

      this._sPathPOValue = oEvent.getSource().getBindingContext("appmodel").getPath();

      if (bMultiplePO)
        Ebeln = this.appmodel.getProperty(this._sPathPOValue + "/PONumber");
      else
        Ebeln = this.appmodel.getProperty("/detailDetail/header/purchaseOrderNumber/value");

      function bindList(oDialog) {
        oDialog.setModel(oModel);
        var oBinding = oView.byId("idVHPOLines").getBinding("items");
        oBinding.filter([new Filter("PurchaseOrder", FilterOperator.EQ, Ebeln)]) //Ebeln        
        // Bind Header Attributes
        oView.byId("poHeaderBox0").bindElement("/A_PurchaseOrder(PurchaseOrder='" + Ebeln + "')"); //poheaderSet,Ebeln
      }

      //create dialog
      if (!this.oDialog) {
        this.oDialog = Fragment.load({
          id: oView.getId("idPOLines_VH"),
          name: "vim_ui.view.fragments.POLines_VH",
          controller: this
        }).then(function (oDialog) {
          // connect dialog to the root view of this component (models, lifecycle)
          oView.addDependent(oDialog);
          oDialog.open();
          bindList(oDialog);
        }.bind(this));
      } else {
        var oDialog = this.getView().byId("idPOLines_VH");
        oDialog.open();
        bindList(oDialog);
      }
    },

    onPOLinesDialogClose: function (oEvent) {
      this.getView().byId("idPOLines_VH").close();
    },

    onPressPOLineItem: function (oEvent) {
      var obj = oEvent.getSource().getBindingContext().getObject();

      this.appmodel.setProperty(this._sPathPOValue + "/PONumber", obj.PurchaseOrder);
      this.appmodel.setProperty(this._sPathPOValue + "/POLineItem", obj.PurchaseOrderItem);
      this.appmodel.setProperty(this._sPathPOValue + "/UoM", obj.PurchaseOrderQuantityUnit);
      this.getView().byId("idPOLines_VH").close();
    },

    onPOSearch: function (oEvent) {
      // //debugger;
      var oView = this.getView();
      var sPO = oEvent.getParameter("query");
      // var oDialog = this.getView().byId("idPOLines_VH");      
      var oBinding = oView.byId("idVHPOLines").getBinding("items");
      oBinding.filter([new Filter("PurchaseOrder", FilterOperator.EQ, sPO)])

      // Bind Header Attributes
      oView.byId("poHeaderBox0").bindElement("/A_PurchaseOrder(PurchaseOrder='" + sPO + "')");

    },


    /* Purchase Order Value help in case of Multiple PO scenario */

    onMultiplePOVH: function (oEvent) {
      this.oInput = oEvent.getSource();
      var oView = this.getView();

      this._sPathPOValue = oEvent.getSource().getBindingContext("appmodel").getPath();
      this._oldPOinLine = this.appmodel.getProperty(this._sPathPOValue + "/PONumber");
      //create dialog
      if (!this.getView().byId("multiplePODialog")) {
        //load asynchronous fragment (XML)
        Fragment.load({
          id: oView.getId(),
          name: "vim_ui.view.fragments.MultiplePO_VH",
          controller: this
        }).then(function (oDialog) {
          oView.addDependent(oDialog);
          oDialog.open();
        });
      } else {
        var oDialog = this.getView().byId("multiplePODialog");
        oDialog.open();
      }
    },


    onSearchMultPO: function (oEvent) {
      var oDialog = this.getView().byId("multiplePODialog");
      var sTerm = oEvent.getParameter('value');

      //sTerm = this.convertToPattern(sTerm);

      var oBinding = oDialog.getBinding("items");
      // build filter array
      var aFilter = [];
      if (sTerm) {
        aFilter.push(new Filter("PONumber", FilterOperator.Contains, sTerm));
      }

      oBinding.filter(aFilter);
    },

    onConfirmMultPO: function (oEvent) {
      var sPO = oEvent.getParameter("selectedItem").getTitle();
      if (this._oldPOinLine != sPO) {
        this.setPONumberForLine(sPO, this._sPathPOValue);
      }
      this.oInput.setValue(sPO);
    },

    onCancelMultPO: function (oEvent) {
      // filter binding
      var oList = this.getView().byId("multiplePODialog");
      var oBinding = oList.getBinding("items");
      oBinding.filter([]);
    },

    onMultiPOInputChange: function (oEvent) {
      var sPO = oEvent.getParameter("value");
      var sPath = oEvent.getSource().getBindingContext("appmodel").getPath();
      if (sPO.length < 10) {
        MessageBox.error(oBundle.getText("PurchaseOrderCannotBeLessThan", ["10"]));
        this.appmodel.setProperty(sPath + "/PONumber", "");
        this.appmodel.setProperty(sPath + "/POLineItem", "");
      } else {
        this.appmodel.setProperty(sPath + "/PONumber", sPO);
        this.setPONumberForLine(sPO, sPath);
      }

    },

    //Purchase Orders referements
    onPOrefVH: function (oEvent) {
      this.oInputPoRefs = oEvent.getSource();
      var oView = this.getView();
      var sCompanyCode = this.getView().getModel("detailDetailModel").getProperty("/currentInvoice/CompanyCode");
      var sConsistentValue = this._checkConsistencyOfPreparatoryValue("/currentInvoice/InvoicingParty", oBundle.getText("MissingInputError", [oBundle.getText("InvoicingParty")]));
      if (!sConsistentValue) {
        return;
      }
      var sSupplier = sConsistentValue;
      var aURL = baseManifestUrl + "/odata/getPurchaseOrderRef()?CompanyCode=" + sCompanyCode + "&Supplier=" + sSupplier;
      var oDetailDetailModel = this.getView().getModel("detailDetailModel");
      this.getView().byId('DDPage').setBusy(true);

      const oSuccessFunction = (data) => {
        oDetailDetailModel.setProperty("/valuehelps/poReferements", data.value[0].result.value)
        this.getView().byId('DDPage').setBusy(false);
        if (!this.getView().byId("idPOrefDialog_VH")) {
          Fragment.load({
            id: oView.getId(),
            name: "vim_ui.view.fragments.POrefVH",
            controller: this
          }).then(function (oDialog) {
            oView.addDependent(oDialog);
            oDialog.open();
          });
        } else {
          this.getView().byId("idPOrefDialog_VH").open();
        }
      }

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        this.getView().byId('DDPage').setBusy(false);
        let sMsg = oBundle.getText("UnexpectedErrorOccurred");
        MessageToast.show(sMsg);
        console.log(errorThrown);
      };

      return this.executeRequest(aURL, 'GET', null, oSuccessFunction, oErrorFunction);
    },

    //Purchase Order Items referements
    onPoItemRefVH: function (oEvent) {
      this.oInputPoItemRefs = oEvent.getSource();
      var sPathPoReferements = this.oInputPoItemRefs.getBindingContext("detailDetailModel").getPath() + "/PurchaseOrder";
      var oView = this.getView();
      var sCompanyCode = this.getView().getModel("detailDetailModel").getProperty("/currentInvoice/CompanyCode");
      var sConsistentValue = this._checkConsistencyOfPreparatoryValue(sPathPoReferements, oBundle.getText("MissingInputAlert", [oBundle.getText("To_SelectedPurchaseOrders_PurchaseOrder")]));
      if (!sConsistentValue) {
        return;
      }
      var sPoReferementsValue = sConsistentValue;
      var aURL = baseManifestUrl + "/odata/getPurchaseOrderItemRef()?CompanyCode=" + sCompanyCode + "&PurchaseOrderRef=" + sPoReferementsValue;
      var oDetailDetailModel = this.getView().getModel("detailDetailModel");
      this.getView().byId('DDPage').setBusy(true);

      const oSuccessFunction = (data) => {
        oDetailDetailModel.setProperty("/valuehelps/poItemReferements", data.value[0].result.value)
        this.getView().byId('DDPage').setBusy(false);
        if (!this.getView().byId("idPoItemRefDialog_VH")) {
          Fragment.load({
            id: oView.getId(),
            name: "vim_ui.view.fragments.PoItemRefVH",
            controller: this
          }).then(function (oDialog) {
            oView.addDependent(oDialog);
            oDialog.open();
          });
        } else {
          this.getView().byId("idPoItemRefDialog_VH").open();
        }
      }

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        this.getView().byId('DDPage').setBusy(false);
        let sMsg = oBundle.getText("UnexpectedErrorOccurred");
        MessageToast.show(sMsg);
        console.log(errorThrown);
      };

      return this.executeRequest(aURL, 'GET', null, oSuccessFunction, oErrorFunction);
    },
    

    //Delivery Note referements
    onDeliveryNoteRefVH: function (oEvent) {
      this.oInputDeliveryNoteRefs = oEvent.getSource();
      var oView = this.getView();
      var sConsistentValue = this._checkConsistencyOfPreparatoryValue("/currentInvoice/InvoicingParty", oBundle.getText("MissingInputError", [oBundle.getText("InvoicingParty")]));
      if (!sConsistentValue) {
        return;
      }
      var sSupplier = sConsistentValue;
      var aURL = baseManifestUrl + "/odata/getDeliveryNoteRef()?Supplier=" + sSupplier;
      var oDetailDetailModel = this.getView().getModel("detailDetailModel");
      this.getView().byId('DDPage').setBusy(true);

      const oSuccessFunction = (data) => {
        oDetailDetailModel.setProperty("/valuehelps/deliveryNoteReferements", data.value[0].result)
        this.getView().byId('DDPage').setBusy(false);
        if (!this.getView().byId("idDeliveryNoteRefDialog_VH")) {
          Fragment.load({
            id: oView.getId(),
            name: "vim_ui.view.fragments.DeliveryNoteRefVH",
            controller: this
          }).then(function (oDialog) {
            oView.addDependent(oDialog);
            oDialog.open();
          });
        } else {
          this.getView().byId("idDeliveryNoteRefDialog_VH").open();
        }
      }

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        this.getView().byId('DDPage').setBusy(false);
        let sMsg = oBundle.getText("UnexpectedErrorOccurred");
        MessageToast.show(sMsg);
        console.log(errorThrown);
      };

      return this.executeRequest(aURL, 'GET', null, oSuccessFunction, oErrorFunction);
    },

    //Service entry sheet referements
    onServiceEntrySheetRefVH: function (oEvent) {
      this.oInputServiceEntrySheetRefs = oEvent.getSource();
      var oView = this.getView();
      var sConsistentValue = this._checkConsistencyOfPreparatoryValue("/currentInvoice/InvoicingParty", oBundle.getText("MissingInputError", [oBundle.getText("InvoicingParty")]));
      if (!sConsistentValue) {
        return;
      }
      var sSupplier = sConsistentValue;
      var aURL = baseManifestUrl + "/odata/getServiceEntrySheetRef()?Supplier=" + sSupplier;
      var oDetailDetailModel = this.getView().getModel("detailDetailModel");
      this.getView().byId('DDPage').setBusy(true);

      const oSuccessFunction = (data) => {
        oDetailDetailModel.setProperty("/valuehelps/serviceEntrySheetReferements", data.value[0].result.value)
        this.getView().byId('DDPage').setBusy(false);
        if (!this.getView().byId("idServiceEntrySheetRefDialog_VH")) {
          Fragment.load({
            id: oView.getId(),
            name: "vim_ui.view.fragments.ServiceEntrySheetRefVH",
            controller: this
          }).then(function (oDialog) {
            oView.addDependent(oDialog);
            oDialog.open();
          });
        } else {
          this.getView().byId("idServiceEntrySheetRefDialog_VH").open();
        }
      }

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        this.getView().byId('DDPage').setBusy(false);
        let sMsg = oBundle.getText("UnexpectedErrorOccurred");
        MessageToast.show(sMsg);
        console.log(errorThrown);
      };

      return this.executeRequest(aURL, 'GET', null, oSuccessFunction, oErrorFunction);
    },

    //Service entry sheet items referements
    onServiceEntrySheetItemRefVH: function (oEvent) {
      this.oInputServiceEntrySheetItemRefs = oEvent.getSource();
      var sPathServiceEntrySheetReferements = this.oInputServiceEntrySheetItemRefs.getBindingContext("detailDetailModel").getPath() + "/ServiceEntrySheet";
      var oView = this.getView();
      var sConsistentValue = this._checkConsistencyOfPreparatoryValue(sPathServiceEntrySheetReferements, oBundle.getText("MissingInputAlert", [oBundle.getText("To_SelectedServiceEntrySheets_ServiceEntrySheet")]));
      if (!sConsistentValue) {
        return;
      }
      var sServiceEntrySheetReferementsValue = sConsistentValue;
      var aURL = baseManifestUrl + "/odata/getServiceEntrySheetItemRef()?ServiceEntrySheetRef=" + sServiceEntrySheetReferementsValue;
      var oDetailDetailModel = this.getView().getModel("detailDetailModel");
      this.getView().byId('DDPage').setBusy(true);

      const oSuccessFunction = (data) => {
        oDetailDetailModel.setProperty("/valuehelps/serviceEntrySheetItemReferements", data.value[0].result.value)
        this.getView().byId('DDPage').setBusy(false);
        if (!this.getView().byId("idServiceEntrySheetItemRefDialog_VH")) {
          Fragment.load({
            id: oView.getId(),
            name: "vim_ui.view.fragments.ServiceEntrySheetItemRefVH",
            controller: this
          }).then(function (oDialog) {
            oView.addDependent(oDialog);
            oDialog.open();
          });
        } else {
          this.getView().byId("idServiceEntrySheetItemRefDialog_VH").open();
        }
      }

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        this.getView().byId('DDPage').setBusy(false);
        let sMsg = oBundle.getText("UnexpectedErrorOccurred");
        MessageToast.show(sMsg);
        console.log(errorThrown);
      };

      return this.executeRequest(aURL, 'GET', null, oSuccessFunction, oErrorFunction);
    },

    //Gl Account
    onGLAcctVH: function (oEvent) {
      this.oInputGlAccount = oEvent.getSource();
      var oView = this.getView();
      var sCompanyCode = this.getView().getModel("detailDetailModel").getProperty("/currentInvoice/CompanyCode");
      var aURL = baseManifestUrl + "/odata/getGlAccount()?CompanyCode=" + sCompanyCode;
      var oDetailDetailModel = this.getView().getModel("detailDetailModel");
      this.getView().byId('DDPage').setBusy(true);

      const oSuccessFunction = (data) => {
        oDetailDetailModel.setProperty("/valuehelps/glAccounts", data.value[0].result)
        this.getView().byId('DDPage').setBusy(false);
        if (!this.getView().byId("idGlAccountsDialog_VH")) {
          Fragment.load({
            id: oView.getId(),
            name: "vim_ui.view.fragments.GlAccountsVH",
            controller: this
          }).then(function (oDialog) {
            oView.addDependent(oDialog);
            oDialog.open();
          });
        } else {
          this.getView().byId("idGlAccountsDialog_VH").open();
        }
      }

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        this.getView().byId('DDPage').setBusy(false);
        let sMsg = oBundle.getText("UnexpectedErrorOccurred");
        MessageToast.show(sMsg);
        console.log(errorThrown);
      };

      return this.executeRequest(aURL, 'GET', null, oSuccessFunction, oErrorFunction);
    },

    onPayTermsVH: function (oEvent) {
      this.oInput = oEvent.getSource();
      var oView = this.getView();
      var aURL = baseManifestUrl + "/odata/getPaymentTerms()";
      var oDetailDetailModel = this.getView().getModel("detailDetailModel");
      this.getView().byId('DDPage').setBusy(true);

      const oSuccessFunction = (data) => {
        oDetailDetailModel.setProperty("/valuehelps/paymentTerms", data.value[0].result)
        this.getView().byId('DDPage').setBusy(false);
        if (!this.getView().byId("idPayDialog_VH")) {
          Fragment.load({
            id: oView.getId(),
            name: "vim_ui.view.fragments.PayTermsVH",
            controller: this
          }).then(function (oDialog) {
            oView.addDependent(oDialog);
            oDialog.open();
          });
        } else {
          this.getView().byId("idPayDialog_VH").open();
        }
      }

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        this.getView().byId('DDPage').setBusy(false);
        let sMsg = oBundle.getText("UnexpectedErrorOccurred");
        MessageToast.show(sMsg);
        console.log(errorThrown);
      };

      return this.executeRequest(aURL, 'GET', null, oSuccessFunction, oErrorFunction);
    },

    //Cost Centers
    onCostCentersVH: function (oEvent) {
      this.oInputCostCenter = oEvent.getSource();
      var oView = this.getView();
      var sCompanyCode = this.getView().getModel("detailDetailModel").getProperty("/currentInvoice/CompanyCode");
      var aURL = baseManifestUrl + "/odata/getCostCenters()?CompanyCode=" + sCompanyCode;
      var oDetailDetailModel = this.getView().getModel("detailDetailModel");
      this.getView().byId('DDPage').setBusy(true);

      const oSuccessFunction = (data) => {
        oDetailDetailModel.setProperty("/valuehelps/costCenters", data.value[0].result)
        this.getView().byId('DDPage').setBusy(false);
        if (!this.getView().byId("idCostCentersDialog_VH")) {
          Fragment.load({
            id: oView.getId(),
            name: "vim_ui.view.fragments.CostCentersVH",
            controller: this
          }).then(function (oDialog) {
            oView.addDependent(oDialog);
            oDialog.open();
          });
        } else {
          this.getView().byId("idCostCentersDialog_VH").open();
        }
      }

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        this.getView().byId('DDPage').setBusy(false);
        let sMsg = oBundle.getText("UnexpectedErrorOccurred");
        MessageToast.show(sMsg);
        console.log(errorThrown);
      };

      return this.executeRequest(aURL, 'GET', null, oSuccessFunction, oErrorFunction);
    },

    //Debit Credit codes
    onDebitCreditCodesVH: function (oEvent) {
      this.oInputDebitCreditCode = oEvent.getSource();
      var oView = this.getView();
      var aURL = baseManifestUrl + "/odata/getDebitCreditCodes()";
      var oDetailDetailModel = this.getView().getModel("detailDetailModel");
      this.getView().byId('DDPage').setBusy(true);

      const oSuccessFunction = (data) => {
        let aSubsequentValues = data.value[0].result.map(sValue => {return {"subsequentValue": sValue}})
        oDetailDetailModel.setProperty("/valuehelps/debitCredits", aSubsequentValues)
        this.getView().byId('DDPage').setBusy(false);
        if (!this.getView().byId("idSubsequentDebitCreditDialog_VH")) {
          Fragment.load({
            id: oView.getId(),
            name: "vim_ui.view.fragments.SubsequentDebitCredit",
            controller: this
          }).then(function (oDialog) {
            oView.addDependent(oDialog);
            oDialog.open();
          });
        } else {
          this.getView().byId("idSubsequentDebitCreditDialog_VH").open();
        }
      }

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        this.getView().byId('DDPage').setBusy(false);
        let sMsg = oBundle.getText("UnexpectedErrorOccurred");
        MessageToast.show(sMsg);
        console.log(errorThrown);
      };

      return this.executeRequest(aURL, 'GET', null, oSuccessFunction, oErrorFunction);
    },


    //Tax Code
    onTaxCodeVH: function (oEvent) {
      this.oInputTaxCode = oEvent.getSource();
      var oView = this.getView();
      var aURL = baseManifestUrl + "/odata/getTaxCodes()";
      var oDetailDetailModel = this.getView().getModel("detailDetailModel");
      this.getView().byId('DDPage').setBusy(true);

      const oSuccessFunction = (data) => {
        oDetailDetailModel.setProperty("/valuehelps/taxCodes", data.value[0].result)
        this.getView().byId('DDPage').setBusy(false);
        if (!this.getView().byId("idTaxCodesDialog_VH")) {
          Fragment.load({
            id: oView.getId(),
            name: "vim_ui.view.fragments.TaxCodeVH",
            controller: this
          }).then(function (oDialog) {
            oView.addDependent(oDialog);
            oDialog.open();
          });
        } else {
          this.getView().byId("idTaxCodesDialog_VH").open();
        }
      }

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        this.getView().byId('DDPage').setBusy(false);
        let sMsg = oBundle.getText("UnexpectedErrorOccurred");
        MessageToast.show(sMsg);
        console.log(errorThrown);
      };

      return this.executeRequest(aURL, 'GET', null, oSuccessFunction, oErrorFunction);
    },

    onSearchTaxCodes: function (oEvent) {
      var sValue = oEvent.getParameter("value");
      if (sValue) {
        var sFilter = new Filter({
          filters: [
            new Filter("TaxCode", FilterOperator.Contains, sValue),
            new Filter("TaxCodeName", FilterOperator.Contains, sValue),
          ]
        });
      }
      var oList = this.getView().byId("idTaxCodesDialog_VH");
      var oBinding = oList.getBinding("items");
      oBinding.filter(sFilter);
    },

    onSearchPayTerms: function (oEvent) {
      var sValue = oEvent.getParameter("value");
      if (sValue) {
        var sFilter = new Filter({
          filters: [
            new Filter("PaymentTerms", FilterOperator.Contains, sValue),
            new Filter("PaymentTermsName", FilterOperator.Contains, sValue)
          ]
        });
      }
      var oList = this.getView().byId("idPayDialog_VH");
      var oBinding = oList.getBinding("items");
      oBinding.filter(sFilter);
    },

    onSearchGlAccounts: function (oEvent) {
      var sValue = oEvent.getParameter("value");
      if (sValue) {
        var sFilter = new Filter({
          filters: [
            new Filter("GLAccount", FilterOperator.Contains, sValue),
            new Filter("GLAccountLongName", FilterOperator.Contains, sValue)
          ]
        });
      }
      var oList = this.getView().byId("idGlAccountsDialog_VH");
      var oBinding = oList.getBinding("items");
      oBinding.filter(sFilter);
    },

    onSearchPOreferements: function (oEvent) {
      var sValue = oEvent.getParameter("value");
      if (sValue) {
        var sFilter = new Filter({
          filters: [
            new Filter("PurchaseOrder", FilterOperator.Contains, sValue),
            new Filter("PurchaseOrderType", FilterOperator.Contains, sValue),
            new Filter("PurchaseOrderDate", FilterOperator.Contains, sValue),
            new Filter("Supplier", FilterOperator.Contains, sValue),
            new Filter("DocumentCurrency", FilterOperator.Contains, sValue)
          ]
        });
      }
      var oList = this.getView().byId("idPOrefDialog_VH");
      var oBinding = oList.getBinding("items");
      oBinding.filter(sFilter);
    },

    onSearchPoItemReferements: function (oEvent) {
      var sValue = oEvent.getParameter("value");
      if (sValue) {
        var sFilter = new Filter({
          filters: [
            new Filter("PurchaseOrderItem", FilterOperator.Contains, sValue),
            new Filter("PurchaseOrderItemText", FilterOperator.Contains, sValue),
            new Filter("PurchaseOrder", FilterOperator.Contains, sValue),
            new Filter("MaterialGroup", FilterOperator.Contains, sValue),
            new Filter("Material", FilterOperator.Contains, sValue),
            new Filter("MaterialType", FilterOperator.Contains, sValue),
            new Filter("Plant", FilterOperator.Contains, sValue),
            new Filter("PurchaseOrderQuantityUnit", FilterOperator.Contains, sValue),
            new Filter("NetPriceQuantity", FilterOperator.Contains, sValue),
            new Filter("OrderQuantity", FilterOperator.Contains, sValue),
            new Filter("NetPriceAmount", FilterOperator.Contains, sValue),
            new Filter("DocumentCurrency", FilterOperator.Contains, sValue)
          ]
        });
      }
      var oList = this.getView().byId("idPOrefDialog_VH");
      var oBinding = oList.getBinding("items");
      oBinding.filter(sFilter);
    },

    onSearchDeliveryNoteReferements: function (oEvent) {
      var sValue = oEvent.getParameter("value");
      if (sValue) {
        var sFilter = new Filter({
          filters: [
            new Filter("InboundDelivery", FilterOperator.Contains, sValue),
            new Filter("InboundDeliveryItem", FilterOperator.Contains, sValue),
            new Filter("CreatedByUser", FilterOperator.Contains, sValue),
            new Filter("CreationDate", FilterOperator.Contains, sValue),
            new Filter("CreationTime", FilterOperator.Contains, sValue),
            new Filter("Supplier", FilterOperator.Contains, sValue),
            new Filter("Material", FilterOperator.Contains, sValue),
            new Filter("MaterialGroup", FilterOperator.Contains, sValue),
            new Filter("MaterialFreightGroup", FilterOperator.Contains, sValue),
            new Filter("Plant", FilterOperator.Contains, sValue),
            new Filter("DeliveryDocumentItemText", FilterOperator.Contains, sValue),
            new Filter("ActualDeliveryQuantity", FilterOperator.Contains, sValue),
            new Filter("OriginalDeliveryQuantity", FilterOperator.Contains, sValue),
            new Filter("DeliveryQuantityUnit", FilterOperator.Contains, sValue),
            new Filter("BaseUnit", FilterOperator.Contains, sValue),
            new Filter("StockType", FilterOperator.Contains, sValue),
            new Filter("CostCenter", FilterOperator.Contains, sValue),
            new Filter("PurchaseOrder", FilterOperator.Contains, sValue),
            new Filter("PurchaseOrderItem", FilterOperator.Contains, sValue)
          ]
        });
      }
      var oList = this.getView().byId("idDeliveryNoteRefDialog_VH");
      var oBinding = oList.getBinding("items");
      oBinding.filter(sFilter);
    },

    onSearchServiceEntrySheets: function (oEvent) {
      var sValue = oEvent.getParameter("value");
      if (sValue) {
        var sFilter = new Filter({
          filters: [
            new Filter("ServiceEntrySheet", FilterOperator.Contains, sValue),
            new Filter("CreatedByUser", FilterOperator.Contains, sValue),
            new Filter("CreationDateTime", FilterOperator.Contains, sValue),
            new Filter("PurchasingOrganization", FilterOperator.Contains, sValue),
            new Filter("PurchasingGroup", FilterOperator.Contains, sValue),
            new Filter("MaterialDocument", FilterOperator.Contains, sValue),
            new Filter("MaterialDocumentYear", FilterOperator.Contains, sValue),
            new Filter("PurchaseOrder", FilterOperator.Contains, sValue),
            new Filter("Supplier", FilterOperator.Contains, sValue)
          ]
        });
      }
      var oList = this.getView().byId("idServiceEntrySheetRefDialog_VH");
      var oBinding = oList.getBinding("items");
      oBinding.filter(sFilter);
    },

    onSearchServiceEntrySheetsItem: function (oEvent) {
      var sValue = oEvent.getParameter("value");
      if (sValue) {
        var sFilter = new Filter({
          filters: [
            new Filter("ServiceEntrySheet", FilterOperator.Contains, sValue),
            new Filter("ServiceEntrySheetItem", FilterOperator.Contains, sValue),
            new Filter("AccountAssignmentCategory", FilterOperator.Contains, sValue),
            new Filter("CreatedByUser", FilterOperator.Contains, sValue),
            new Filter("CreationDateTime", FilterOperator.Contains, sValue),
            new Filter("PurchasingOrganization", FilterOperator.Contains, sValue),
            new Filter("PurchasingGroup", FilterOperator.Contains, sValue),
            new Filter("Plant", FilterOperator.Contains, sValue),
            new Filter("Currency", FilterOperator.Contains, sValue),
            new Filter("MaterialGroup", FilterOperator.Contains, sValue),
            new Filter("PurchaseOrder", FilterOperator.Contains, sValue),
            new Filter("PurchaseOrderItem", FilterOperator.Contains, sValue)
          ]
        });
      }
      var oList = this.getView().byId("idServiceEntrySheetItemRefDialog_VH");
      var oBinding = oList.getBinding("items");
      oBinding.filter(sFilter);
    },

    onSearchCostCenters: function (oEvent) {
      var sValue = oEvent.getParameter("value");
      if (sValue) {
        var sFilter = new Filter({
          filters: [
            new Filter("CostCenter", FilterOperator.Contains, sValue),
            new Filter("CostCenterName", FilterOperator.Contains, sValue),
            new Filter("ValidityEndDate", FilterOperator.Contains, sValue)
          ]
        });
      }
      var oList = this.getView().byId("idCostCentersDialog_VH");
      var oBinding = oList.getBinding("items");
      oBinding.filter(sFilter);
    },

    onSearchDebitCredits: function (oEvent) {
      var sValue = oEvent.getParameter("value");
      if (sValue) {
        var sFilter = new Filter({
          filters: [
            new Filter("subsequentValue", FilterOperator.Contains, sValue)
          ]
        });
      }
      var oList = this.getView().byId("idSubsequentDebitCreditDialog_VH");
      var oBinding = oList.getBinding("items");
      oBinding.filter(sFilter);
    },

    onConfirmTaxCode: function (oEvent) {
      var sPath = oEvent.getParameter("selectedItem").getBindingContextPath("detailDetailModel");
      var sTaxCode = this.getView().getModel("detailDetailModel").getProperty(sPath + "/TaxCode");
      this.oInputTaxCode.setValue(sTaxCode);
      this.oInputTaxCode.fireChangeEvent(sTaxCode);
    },

    onConfirmPayTerms: function (oEvent) {
      var sPath = oEvent.getParameter("selectedItem").getBindingContextPath("detailDetailModel");
      var sPaymentTerms = this.getView().getModel("detailDetailModel").getProperty(sPath + "/PaymentTerms");
      this.getView().byId("idPaymentTerms").setValue(sPaymentTerms);
      this.getView().byId("idPaymentTerms").fireChangeEvent(sPaymentTerms);
    },


    onConfirmGlAccount: function (oEvent) {
      var sPath = oEvent.getParameter("selectedItem").getBindingContextPath("detailDetailModel");
      var sGLAccount = this.getView().getModel("detailDetailModel").getProperty(sPath + "/GLAccount");
      this.oInputGlAccount.setValue(sGLAccount);
      this.oInputGlAccount.fireChangeEvent(sGLAccount);
    },

    onConfirmAddByCopy: function () {
      MessageBox.warning(oBundle.getText("AlertConfirmCloseAddByCopyPORow"), {
        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
        emphasizedAction: MessageBox.Action.NO,
        onClose: function (sAction) {
          if(sAction === "YES") {      
            aNewSelectedDeliveryNotesRecords.forEach(oData => {
              this._addPORow(oData);
            });
            
            aNewSelectedServiceEntrySheetsRecords.forEach(oData => {
              this._addPORow(oData);
            });
            aNewSelectedPurchaseOrdersRecords = [];
            aNewSelectedDeliveryNotesRecords = [];
            aNewSelectedServiceEntrySheetsRecords = [];
            this.getView().getModel("detailDetailModel").setProperty("/currentInvoice/To_SelectedPurchaseOrders", []);
            this.getView().getModel("detailDetailModel").setProperty("/currentInvoice/To_SelectedDeliveryNotes", []);
            this.getView().getModel("detailDetailModel").setProperty("/currentInvoice/To_SelectedServiceEntrySheets", []);
            this.getView().byId("addPoCopyDialog").close();
          }
        }.bind(this)
      });
    },


    onConfirmPOreferement: function (oEvent) {
      var sPath = oEvent.getParameter("selectedItem").getBindingContextPath("detailDetailModel");
      var sPoRef = this.getView().getModel("detailDetailModel").getProperty(sPath + "/PurchaseOrder");
      this.oInputPoRefs.setValue(sPoRef);
      this.oInputPoRefs.fireChangeEvent(sPoRef);

      // Find the sibling Input control in the same row
      var oParentRow = this.oInputPoRefs.getParent(); // Get the parent (row template)
      if (oParentRow) {
        // Find all content within the row
        var aCells = oParentRow.getCells();
        if (aCells && aCells.length > 1) {
          // Assuming the second Input is the sibling
          var oSiblingInput = aCells[1]; // The second cell
          if (oSiblingInput && oSiblingInput.setValue) {
            oSiblingInput.setValue(""); // Clear the value
            oSiblingInput.fireChangeEvent(""); // Trigger the change event
          }
        }
      }
    },


    onConfirmPoItemReferement: function (oEvent) {
      var oDetailDetailModel = this.getView().getModel("detailDetailModel");
      var sPath = oEvent.getParameter("selectedItem").getBindingContextPath("detailDetailModel");
      var sPoItemRef = oDetailDetailModel.getProperty(sPath + "/PurchaseOrderItem");
      this.oInputPoItemRefs.setValue(sPoItemRef);
      this.oInputPoItemRefs.fireChangeEvent(sPoItemRef);

      var sPathPoRef = this.oInputPoItemRefs.getBindingContext("detailDetailModel").getPath() + "/PurchaseOrder";
      var sPoRef = oDetailDetailModel.getProperty(sPathPoRef);
      var aURL = baseManifestUrl + "/odata/getPOAccountAssignment()?PurchaseOrderRef=" + sPoRef + "&PurchaseOrderItemRef=" + sPoItemRef;
      this.getView().byId('DDPage').setBusy(true);

      var sLineDetailPath = this.oInputPoItemRefs.getBindingContext("detailDetailModel").getPath();

      const oSuccessFunction = (data) => {
        let retrievedData = data.value[0].result.length>0? data.value[0].result[0] : {};
        this.getView().byId('DDPage').setBusy(false);
        let oData = {
          "PurchaseOrder": oDetailDetailModel.getProperty(sPath + "/PurchaseOrder"),
          "PurchaseOrderItem": oDetailDetailModel.getProperty(sPath + "/PurchaseOrderItem"),
          "Plant": oDetailDetailModel.getProperty(sPath + "/Plant"),
          "TaxCode": oDetailDetailModel.getProperty(sPath + "/TaxCode"),
          "SupplierInvoiceItemAmount": oDetailDetailModel.getProperty(sPath + "/NetAmount"),
          "PurchaseOrderQuantityUnit": oDetailDetailModel.getProperty(sPath + "/PurchaseOrderQuantityUnit"),
          "QuantityInPurchaseOrderUnit": oDetailDetailModel.getProperty(sPath + "/OrderQuantity"),
          "IsFinallyInvoiced": oDetailDetailModel.getProperty(sPath + "/IsFinallyInvoiced"),
          "ReferenceDocument": retrievedData.ReferenceDocument != "" ? retrievedData.ReferenceDocument : null,
          "ReferenceDocumentFiscalYear": retrievedData.ReferenceDocumentFiscalYear != "" ? retrievedData.ReferenceDocumentFiscalYear : null,
          "ReferenceDocumentItem": retrievedData.ReferenceDocumentItem != "" ? retrievedData.ReferenceDocumentItem : null,
          "CostCenter": retrievedData.CostCenter != "" ? retrievedData.CostCenter : null,
          "ControllingArea": retrievedData.ControllingArea != "" ? retrievedData.ControllingArea : null,
          "BusinessArea": retrievedData.BusinessArea != "" ? retrievedData.BusinessArea : null,
          "ProfitCenter": retrievedData.ProfitCenter != "" ? retrievedData.ProfitCenter : null,
          "FunctionalArea": retrievedData.FunctionalArea != "" ? retrievedData.FunctionalArea : null,
          "WBSElement": retrievedData.WBSElementInternalID_2 != "" ? retrievedData.WBSElementInternalID_2 : null,
          "SalesOrder": retrievedData.SalesOrder != "" ? retrievedData.SalesOrder : null,
          "SalesOrderItem": retrievedData.SalesOrderItem != "" ? retrievedData.SalesOrderItem : null,
          "InternalOrder": retrievedData.OrderInternalID != "" ? retrievedData.OrderInternalID : null,
          "CommitmentItem": retrievedData.CommitmentItemShortID != "" ? retrievedData.CommitmentItemShortID : null,
          "FundsCenter": retrievedData.FundsCenter != "" ? retrievedData.FundsCenter : null,
          "Fund": retrievedData.Fund != "" ? retrievedData.Fund : null,
          "GrantID": retrievedData.GrantID != "" ? retrievedData.GrantID : null,
          "ProfitabilitySegment": retrievedData.ProfitabilitySegment_2 != "" ? retrievedData.ProfitabilitySegment_2 : null,
          "BudgetPeriod": retrievedData.BudgetPeriod != "" ? retrievedData.BudgetPeriod : null,
          "AccountAssignmentNumber": retrievedData.AccountAssignmentNumber !== "" ? retrievedData.AccountAssignmentNumber : null,
        };
        // this._addPORow(oData);
        // aNewSelectedPurchaseOrdersRecords.push(oData);
        this.assignValueToLineItemField(oData, sLineDetailPath, oDetailDetailModel);
      }

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        this.getView().byId('DDPage').setBusy(false);
        let sMsg = oBundle.getText("UnexpectedErrorOccurred");
        MessageToast.show(sMsg);
        console.log(errorThrown);
      };

      return this.executeRequest(aURL, 'GET', null, oSuccessFunction, oErrorFunction);
    },

    assignValueToLineItemField: function (oData, sLineDetailPath, oDetailDetailModel) {
      let aDataKeys = Object.keys(oData);
      aDataKeys.forEach(sKey => {
        if (!oDetailDetailModel.getProperty(sLineDetailPath+"/"+sKey)) {
          oDetailDetailModel.setProperty(sLineDetailPath+"/"+sKey, oData[sKey]);
        }
      });
    },

    onConfirmDeliveryNoteReferement: function (oEvent) {
      var sPath = oEvent.getParameter("selectedItem").getBindingContextPath("detailDetailModel");
      var sInboundDeliveryRef = this.getView().getModel("detailDetailModel").getProperty(sPath + "/InboundDelivery");
      var sPoRef = this.getView().getModel("detailDetailModel").getProperty(sPath + "/PurchaseOrder");
      var sPoItemRef = this.getView().getModel("detailDetailModel").getProperty(sPath + "/PurchaseOrderItem");
      this.oInputDeliveryNoteRefs.setValue(sInboundDeliveryRef);
      this.oInputDeliveryNoteRefs.fireChangeEvent(sInboundDeliveryRef);

      var aURL = baseManifestUrl + "/odata/getPOAccountAssignment()?PurchaseOrderRef=" + sPoRef + "&PurchaseOrderItemRef=" + sPoItemRef;
      this.getView().byId('DDPage').setBusy(true);

      const oSuccessFunction = (data) => {
        let retrievedData = data.value[0].result[0];
        this.getView().byId('DDPage').setBusy(false);
        if (retrievedData) {
          let oData = {
            "PurchaseOrder": this.getView().getModel("detailDetailModel").getProperty(sPath + "/PurchaseOrder"),
            "PurchaseOrderItem": this.getView().getModel("detailDetailModel").getProperty(sPath + "/PurchaseOrderItem"),
            "Plant": this.getView().getModel("detailDetailModel").getProperty(sPath + "/Plant"),
            "PurchaseOrderQuantityUnit": this.getView().getModel("detailDetailModel").getProperty(sPath + "/DeliveryQuantityUnit"),
            "QuantityInPurchaseOrderUnit": this.getView().getModel("detailDetailModel").getProperty(sPath + "/ActualDeliveryQuantity"),
            "ReferenceDocument": retrievedData.ReferenceDocument != "" ? retrievedData.ReferenceDocument : null,
            "ReferenceDocumentFiscalYear": retrievedData.ReferenceDocumentFiscalYear != "" ? retrievedData.ReferenceDocumentFiscalYear : null,
            "ReferenceDocumentItem": retrievedData.ReferenceDocumentItem != "" ? retrievedData.ReferenceDocumentItem : null,
            "CostCenter": retrievedData.CostCenter != "" ? retrievedData.CostCenter : null,
            "ControllingArea": retrievedData.ControllingArea != "" ? retrievedData.ControllingArea : null,
            "BusinessArea": retrievedData.BusinessArea != "" ? retrievedData.BusinessArea : null,
            "ProfitCenter": retrievedData.ProfitCenter != "" ? retrievedData.ProfitCenter : null,
            "FunctionalArea": retrievedData.FunctionalArea != "" ? retrievedData.FunctionalArea : null,
            "WBSElement": retrievedData.WBSElementInternalID_2 != "" ? retrievedData.WBSElementInternalID_2 : null,
            "SalesOrder": retrievedData.SalesOrder != "" ? retrievedData.SalesOrder : null,
            "SalesOrderItem": retrievedData.SalesOrderItem != "" ? retrievedData.SalesOrderItem : null,
            "InternalOrder": retrievedData.OrderInternalID != "" ? retrievedData.OrderInternalID : null,
            "CommitmentItem": retrievedData.CommitmentItemShortID != "" ? retrievedData.CommitmentItemShortID : null,
            "FundsCenter": retrievedData.FundsCenter != "" ? retrievedData.FundsCenter : null,
            "Fund": retrievedData.Fund != "" ? retrievedData.Fund : null,
            "GrantID": retrievedData.GrantID != "" ? retrievedData.GrantID : null,
            "ProfitabilitySegment": retrievedData.ProfitabilitySegment_2 != "" ? retrievedData.ProfitabilitySegment_2 : null,
            "BudgetPeriod": retrievedData.BudgetPeriod != "" ? retrievedData.BudgetPeriod : null,
          };
          // this._addPORow(oData);
          aNewSelectedDeliveryNotesRecords.push(oData);
        } else {
          MessageBox.warning(oBundle.getText("NoDataFoundForPurchaseOrderAndPurchaseOrderItem", [this.getView().getModel("detailDetailModel").getProperty(sPath + "/PurchaseOrder"), this.getView().getModel("detailDetailModel").getProperty(sPath + "/PurchaseOrderItem")]));
        }
      }

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        this.getView().byId('DDPage').setBusy(false);
        let sMsg = oBundle.getText("UnexpectedErrorOccurred");
        MessageToast.show(sMsg);
        console.log(errorThrown);
      };

      return this.executeRequest(aURL, 'GET', null, oSuccessFunction, oErrorFunction);
    },


    onConfirmServiceEntrySheet: function (oEvent) {
      var sPath = oEvent.getParameter("selectedItem").getBindingContextPath("detailDetailModel");
      var sServiceEntrySheetRef = this.getView().getModel("detailDetailModel").getProperty(sPath + "/ServiceEntrySheet");
      this.oInputServiceEntrySheetRefs.setValue(sServiceEntrySheetRef);
      this.oInputServiceEntrySheetRefs.fireChangeEvent(sServiceEntrySheetRef);

      // Find the sibling Input control in the same row
      var oParentRow = this.oInputServiceEntrySheetRefs.getParent(); // Get the parent (row template)
      if (oParentRow) {
        // Find all content within the row
        var aCells = oParentRow.getCells();
        if (aCells && aCells.length > 1) {
          // Assuming the second Input is the sibling
          var oSiblingInput = aCells[1]; // The second cell
          if (oSiblingInput && oSiblingInput.setValue) {
            oSiblingInput.setValue(""); // Clear the value
            oSiblingInput.fireChangeEvent(""); // Trigger the change event
          }
        }
      }
    },


    onConfirmServiceEntrySheetItem: function (oEvent) {
      var sPath = oEvent.getParameter("selectedItem").getBindingContextPath("detailDetailModel");
      var sServiceEntrySheetItemRef = this.getView().getModel("detailDetailModel").getProperty(sPath + "/ServiceEntrySheetItem");
      var sPoRef = this.getView().getModel("detailDetailModel").getProperty(sPath + "/PurchaseOrder");
      var sPoItemRef = this.getView().getModel("detailDetailModel").getProperty(sPath + "/PurchaseOrderItem");
      this.oInputServiceEntrySheetItemRefs.setValue(sServiceEntrySheetItemRef);
      this.oInputServiceEntrySheetItemRefs.fireChangeEvent(sServiceEntrySheetItemRef);

      var aURL = baseManifestUrl + "/odata/getPOAccountAssignment()?PurchaseOrderRef=" + sPoRef + "&PurchaseOrderItemRef=" + sPoItemRef;
      this.getView().byId('DDPage').setBusy(true);

      const oSuccessFunction = (data) => {
        let retrievedData = data.value[0].result[0];
        this.getView().byId('DDPage').setBusy(false);
        if (retrievedData) {
          let oData = {
            "PurchaseOrder": this.getView().getModel("detailDetailModel").getProperty(sPath + "/PurchaseOrder"),
            "PurchaseOrderItem": this.getView().getModel("detailDetailModel").getProperty(sPath + "/PurchaseOrderItem"),
            "Plant": this.getView().getModel("detailDetailModel").getProperty(sPath + "/Plant"),
            "TaxCode": this.getView().getModel("detailDetailModel").getProperty(sPath + "/TaxCode"),
            "SupplierInvoiceItemAmount": this.getView().getModel("detailDetailModel").getProperty(sPath + "/NetAmount"),
            "PurchaseOrderQuantityUnit": this.getView().getModel("detailDetailModel").getProperty(sPath + "/QuantityUnit"),
            "QuantityInPurchaseOrderUnit": this.getView().getModel("detailDetailModel").getProperty(sPath + "/ConfirmedQuantity"),
            "ServiceEntrySheet": this.getView().getModel("detailDetailModel").getProperty(sPath + "/ServiceEntrySheet"),
            "ServiceEntrySheetItem": this.getView().getModel("detailDetailModel").getProperty(sPath + "/ServiceEntrySheetItem"),
            "ReferenceDocument": retrievedData.ReferenceDocument != "" ? retrievedData.ReferenceDocument : null,
            "ReferenceDocumentFiscalYear": retrievedData.ReferenceDocumentFiscalYear != "" ? retrievedData.ReferenceDocumentFiscalYear : null,
            "ReferenceDocumentItem": retrievedData.ReferenceDocumentItem != "" ? retrievedData.ReferenceDocumentItem : null,
            "CostCenter": retrievedData.CostCenter != "" ? retrievedData.CostCenter : null,
            "ControllingArea": retrievedData.ControllingArea != "" ? retrievedData.ControllingArea : null,
            "BusinessArea": retrievedData.BusinessArea != "" ? retrievedData.BusinessArea : null,
            "ProfitCenter": retrievedData.ProfitCenter != "" ? retrievedData.ProfitCenter : null,
            "FunctionalArea": retrievedData.FunctionalArea != "" ? retrievedData.FunctionalArea : null,
            "WBSElement": retrievedData.WBSElementInternalID_2 != "" ? retrievedData.WBSElementInternalID_2 : null,
            "SalesOrder": retrievedData.SalesOrder != "" ? retrievedData.SalesOrder : null,
            "SalesOrderItem": retrievedData.SalesOrderItem != "" ? retrievedData.SalesOrderItem : null,
            "InternalOrder": retrievedData.OrderInternalID != "" ? retrievedData.OrderInternalID : null,
            "CommitmentItem": retrievedData.CommitmentItemShortID != "" ? retrievedData.CommitmentItemShortID : null,
            "FundsCenter": retrievedData.FundsCenter != "" ? retrievedData.FundsCenter : null,
            "Fund": retrievedData.Fund != "" ? retrievedData.Fund : null,
            "GrantID": retrievedData.GrantID != "" ? retrievedData.GrantID : null,
            "ProfitabilitySegment": retrievedData.ProfitabilitySegment_2 != "" ? retrievedData.ProfitabilitySegment_2 : null,
            "BudgetPeriod": retrievedData.BudgetPeriod != "" ? retrievedData.BudgetPeriod : null,
          };
          // this._addPORow(oData);
          aNewSelectedServiceEntrySheetsRecords.push(oData);
        } else {
          MessageBox.warning(oBundle.getText("NoDataFoundForPurchaseOrderAndPurchaseOrderItem", [this.getView().getModel("detailDetailModel").getProperty(sPath + "/PurchaseOrder"), this.getView().getModel("detailDetailModel").getProperty(sPath + "/PurchaseOrderItem")]));
        }
      }

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        this.getView().byId('DDPage').setBusy(false);
        let sMsg = oBundle.getText("UnexpectedErrorOccurred");
        MessageToast.show(sMsg);
        console.log(errorThrown);
      };

      return this.executeRequest(aURL, 'GET', null, oSuccessFunction, oErrorFunction);
    },


    onConfirmCostCenter: function (oEvent) {
      var sPath = oEvent.getParameter("selectedItem").getBindingContextPath("detailDetailModel");
      var sCostCenter = this.getView().getModel("detailDetailModel").getProperty(sPath + "/CostCenter");
      this.oInputCostCenter.setValue(sCostCenter);
      this.oInputCostCenter.fireChangeEvent(sCostCenter);
    },


    onConfirmDebitCredit: function (oEvent) {
      var sPath = oEvent.getParameter("selectedItem").getBindingContextPath("detailDetailModel");
      var sDebitCreditCode = this.getView().getModel("detailDetailModel").getProperty(sPath + "/subsequentValue");
      this.oInputDebitCreditCode.setValue(sDebitCreditCode);
      this.oInputDebitCreditCode.fireChangeEvent(sDebitCreditCode);
    },

    _checkConsistencyOfPreparatoryValue: function (sPath, sMessage) {
      var sValue = this.getView().getModel("detailDetailModel").getProperty(sPath);
      if (!sValue || sValue === "") {
        MessageToast.show(sMessage);
        return null;
      }
      return sValue;
    },


    onLiveChangeBPBankAccountInternalID: function (oEvent) {
      var sConsistentValue = this._checkConsistencyOfPreparatoryValue("/currentInvoice/InvoicingParty", oBundle.getText("MissingInputAlert", [oBundle.getText("InvoicingPartyVendorCode")]));
      if (!sConsistentValue) {
        this.getView().byId("idBPBankAccountInternalID").setValue(null);
      }
    },

    //Bank Account Internal ID (Business Partner Bank)
    onBankAccountInternalVH: function (oEvent) {
      var sConsistentValue = this._checkConsistencyOfPreparatoryValue("/currentInvoice/InvoicingParty", oBundle.getText("MissingInputAlert", [oBundle.getText("InvoicingPartyVendorCode")]));
      if (!sConsistentValue) {
        return;
      }
      this.oInput = oEvent.getSource();
      var oView = this.getView();
      var aURL = baseManifestUrl + "/odata/getBusinessPartnerBank()?BusinessPartner=" + sConsistentValue;
      var oDetailDetailModel = this.getView().getModel("detailDetailModel");
      this.getView().byId('DDPage').setBusy(true);

      const oSuccessFunction = (data) => {
        oDetailDetailModel.setProperty("/valuehelps/businessPartnerBanks", data.value[0].result)
        this.getView().byId('DDPage').setBusy(false);
        //create dialog
        if (!this.getView().byId("idPartnerBankDialog_VH")) {
          //load asynchronous fragment (XML)
          Fragment.load({
            id: oView.getId(),
            name: "vim_ui.view.fragments.PartnerBank",
            controller: this
          }).then(function (oDialog) {
            //connect Menu to rootview of this component (models, lifecycle)
            oView.addDependent(oDialog);
            oDialog.open();
          });
        } else {
          this.getView().byId("idPartnerBankDialog_VH").open();
        }
      }

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        this.getView().byId('DDPage').setBusy(false);
        let sMsg = oBundle.getText("UnexpectedErrorOccurred");
        MessageToast.show(sMsg);
        console.log(errorThrown);
      };

      return this.executeRequest(aURL, 'GET', null, oSuccessFunction, oErrorFunction);
    },

    onSearchBusinessPartnerBanks: function (oEvent) {
      var sValue = oEvent.getParameter("value");
      if (sValue) {
        var sFilter = new Filter({
          filters: [
            new Filter("BankIdentification", FilterOperator.Contains, sValue),
            new Filter("BankName", FilterOperator.Contains, sValue),
            new Filter("BankNumber", FilterOperator.Contains, sValue),
            new Filter("IBAN", FilterOperator.Contains, sValue)
          ]
        });
      }
      var oList = this.getView().byId("idPartnerBankDialog_VH");
      var oBinding = oList.getBinding("items");
      oBinding.filter(sFilter);
    },


    onConfirmBusinessPartnerBanks: function (oEvent) {
      var sPath = oEvent.getParameter("selectedItem").getBindingContextPath("detailDetailModel");
      var sBankIdentification = this.getView().getModel("detailDetailModel").getProperty(sPath + "/BankIdentification");
      this.getView().byId("idBPBankAccountInternalID").setValue(sBankIdentification);
      this.getView().byId("idBPBankAccountInternalID").fireChangeEvent(sBankIdentification);
    },

    //Payment Methods
    onPayMethodsVH: function (oEvent) {
      this.oInput = oEvent.getSource();
      var oView = this.getView();
      var sID = this.getView().getModel("detailDetailModel").getProperty("/currentInvoice/header_Id_ItalianInvoiceTrace");
      var aURL = baseManifestUrl + "/odata/getPaymentMethods()?header_Id_ItalianInvoiceTrace=" + sID;
      var oDetailDetailModel = this.getView().getModel("detailDetailModel");
      this.getView().byId('DDPage').setBusy(true);

      const oSuccessFunction = (data) => {
        oDetailDetailModel.setProperty("/valuehelps/paymentMethods", data.value[0].result)
        this.getView().byId('DDPage').setBusy(false);
        if (!this.getView().byId("idPayMethodsDialog_VH")) {
          Fragment.load({
            id: oView.getId(),
            name: "vim_ui.view.fragments.PayMethodsVH",
            controller: this
          }).then(function (oDialog) {
            oView.addDependent(oDialog);
            oDialog.open();
          });
        } else {
          this.getView().byId("idPayMethodsDialog_VH").open();
        }
      }

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        this.getView().byId('DDPage').setBusy(false);
        let sMsg = oBundle.getText("UnexpectedErrorOccurred");
        MessageToast.show(sMsg);
        console.log(errorThrown);
      };

      return this.executeRequest(aURL, 'GET', null, oSuccessFunction, oErrorFunction);
    },

    onSearchPayMethods: function (oEvent) {
      var sValue = oEvent.getParameter("value");
      if (sValue) {
        var sFilter = new Filter({
          filters: [
            new Filter("PaymentMethod", FilterOperator.Contains, sValue),
            new Filter("PaymentMethodName", FilterOperator.Contains, sValue)
          ]
        });
      }
      var oList = this.getView().byId("idPayMethodsDialog_VH");
      var oBinding = oList.getBinding("items");
      oBinding.filter(sFilter);
    },


    onConfirmPayMethods: function (oEvent) {
      var sPath = oEvent.getParameter("selectedItem").getBindingContextPath("detailDetailModel");
      var sPaymentMethod = this.getView().getModel("detailDetailModel").getProperty(sPath + "/PaymentMethod");
      this.getView().byId("idPaymentMethod").setValue(sPaymentMethod);
      this.getView().byId("idPaymentMethod").fireChangeEvent(sPaymentMethod);
    },

    //House Bank
    onHouseBankVH: function (oEvent) {
      this.oInput = oEvent.getSource();
      var oView = this.getView();
      var sCompanyCode = this.getView().getModel("detailDetailModel").getProperty("/currentInvoice/CompanyCode");
      var aURL = baseManifestUrl + "/odata/getHouseBanks()?CompanyCode=" + sCompanyCode;
      var oDetailDetailModel = this.getView().getModel("detailDetailModel");
      this.getView().byId('DDPage').setBusy(true);

      const oSuccessFunction = (data) => {
        oDetailDetailModel.setProperty("/valuehelps/houseBanks", data.value[0].result)
        this.getView().byId('DDPage').setBusy(false);
        //create dialog
        if (!this.getView().byId("idHouseBankDialog_VH")) {
          //load asynchronous fragment (XML)
          Fragment.load({
            id: oView.getId(),
            name: "vim_ui.view.fragments.HouseBanks",
            controller: this
          }).then(function (oDialog) {
            //connect Menu to rootview of this component (models, lifecycle)
            oView.addDependent(oDialog);
            oDialog.open();
          });
        } else {
          this.getView().byId("idHouseBankDialog_VH").open();
        }
      }

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        this.getView().byId('DDPage').setBusy(false);
        let sMsg = oBundle.getText("UnexpectedErrorOccurred");
        MessageToast.show(sMsg);
        console.log(errorThrown);
      };

      return this.executeRequest(aURL, 'GET', null, oSuccessFunction, oErrorFunction);
    },

    onSearchHouseBanks: function (oEvent) {
      var sValue = oEvent.getParameter("value");
      if (sValue) {
        var sFilter = new Filter({
          filters: [
            new Filter("HouseBank", FilterOperator.Contains, sValue),
            new Filter("BankName", FilterOperator.Contains, sValue),
            new Filter("SWIFTCode", FilterOperator.Contains, sValue),
            new Filter("Bank", FilterOperator.Contains, sValue)
          ]
        });
      }
      var oList = this.getView().byId("idHouseBankDialog_VH");
      var oBinding = oList.getBinding("items");
      oBinding.filter(sFilter);
    },

    onConfirmHouseBanks: function (oEvent) {
      var sPath = oEvent.getParameter("selectedItem").getBindingContextPath("detailDetailModel");
      var sHouseBank = this.getView().getModel("detailDetailModel").getProperty(sPath + "/HouseBank");
      this.getView().byId("idHouseBank").setValue(sHouseBank);
      this.getView().byId("idHouseBank").fireChangeEvent(sHouseBank);
    },

    //House Bank Account
    onHouseBankAccountVH: function (oEvent) {
      var sConsistentValue = this._checkConsistencyOfPreparatoryValue("/currentInvoice/HouseBank", oBundle.getText("MissingInputAlert", [oBundle.getText("HouseBank")]));
      if (!sConsistentValue) {
        return;
      }
      var sCompanyCode = this.getView().getModel("detailDetailModel").getProperty("/currentInvoice/CompanyCode");
      this.oInput = oEvent.getSource();
      var oView = this.getView();
      var aURL = baseManifestUrl + "/odata/getHouseBanksAccounts()?CompanyCode=" + sCompanyCode + "&HouseBank=" + sConsistentValue;
      var oDetailDetailModel = this.getView().getModel("detailDetailModel");
      this.getView().byId('DDPage').setBusy(true);

      const oSuccessFunction = (data) => {
        oDetailDetailModel.setProperty("/valuehelps/houseBanksAccount", data.value[0].result)
        this.getView().byId('DDPage').setBusy(false);
        //create dialog
        if (!this.getView().byId("idHouseBanksAccountDialog_VH")) {
          //load asynchronous fragment (XML)
          Fragment.load({
            id: oView.getId(),
            name: "vim_ui.view.fragments.HouseBanksAccount",
            controller: this
          }).then(function (oDialog) {
            //connect Menu to rootview of this component (models, lifecycle)
            oView.addDependent(oDialog);
            oDialog.open();
          });
        } else {
          this.getView().byId("idHouseBanksAccountDialog_VH").open();
        }
      }

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        this.getView().byId('DDPage').setBusy(false);
        let sMsg = oBundle.getText("UnexpectedErrorOccurred");
        MessageToast.show(sMsg);
        console.log(errorThrown);
      };

      return this.executeRequest(aURL, 'GET', null, oSuccessFunction, oErrorFunction);
    },

    onSearchHouseBanksAccount: function (oEvent) {
      var sValue = oEvent.getParameter("value");
      if (sValue) {
        var sFilter = new Filter({
          filters: [
            new Filter("HouseBankAccount", FilterOperator.Contains, sValue),
            new Filter("IBAN", FilterOperator.Contains, sValue),
            new Filter("BankAccountDescription", FilterOperator.Contains, sValue)
          ]
        });
      }
      var oList = this.getView().byId("idHouseBanksAccountDialog_VH");
      var oBinding = oList.getBinding("items");
      oBinding.filter(sFilter);
    },


    onConfirmHouseBanksAccount: function (oEvent) {
      var sPath = oEvent.getParameter("selectedItem").getBindingContextPath("detailDetailModel");
      var sHouseBankAccount = this.getView().getModel("detailDetailModel").getProperty(sPath + "/HouseBankAccount");
      this.getView().byId("idHouseBankAccount").setValue(sHouseBankAccount);
      this.getView().byId("idHouseBankAccount").fireChangeEvent(sHouseBankAccount);
    },

    onLiveChangeHouseBanksAccount: function (oEvent) {
      var sConsistentValue = this._checkConsistencyOfPreparatoryValue("/currentInvoice/HouseBank", oBundle.getText("MissingInputAlert", [oBundle.getText("HouseBank")]));
      if (!sConsistentValue) {
        this.getView().byId("idHouseBankAccount").setValue(null);
      }
    },

    //Accounting Document Type
    onAccountingDocumentTypeVH: function (oEvent) {
      this.oInput = oEvent.getSource();
      var oView = this.getView();
      var sID = this.getView().getModel("detailDetailModel").getProperty("/currentInvoice/header_Id_ItalianInvoiceTrace");
      var aURL = baseManifestUrl + "/odata/getAccountingDocumentType()?header_Id_ItalianInvoiceTrace=" + sID;
      var oDetailDetailModel = this.getView().getModel("detailDetailModel");
      this.getView().byId('DDPage').setBusy(true);

      const oSuccessFunction = (data) => {
        oDetailDetailModel.setProperty("/valuehelps/accountingDocumentType", data.value[0].result)
        this.getView().byId('DDPage').setBusy(false);
        if (!this.getView().byId("idAccDocumentTypeDialog_VH")) {
          Fragment.load({
            id: oView.getId(),
            name: "vim_ui.view.fragments.AccountingDocumentTypeVH",
            controller: this
          }).then(function (oDialog) {
            oView.addDependent(oDialog);
            oDialog.open();
          });
        } else {
          this.getView().byId("idAccDocumentTypeDialog_VH").open();
        }
      }

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        this.getView().byId('DDPage').setBusy(false);
        let sMsg = oBundle.getText("UnexpectedErrorOccurred");
        MessageToast.show(sMsg);
        console.log(errorThrown);
      };

      return this.executeRequest(aURL, 'GET', null, oSuccessFunction, oErrorFunction);
    },

    onSearchAccDocumentType: function (oEvent) {
      var sValue = oEvent.getParameter("value");
      if (sValue) {
        var sFilter = new Filter({
          filters: [
            new Filter("AccountingDocumentType", FilterOperator.Contains, sValue),
            new Filter("AccountingDocumentTypeName", FilterOperator.Contains, sValue)
          ]
        });
      }
      var oList = this.getView().byId("idAccDocumentTypeDialog_VH");
      var oBinding = oList.getBinding("items");
      oBinding.filter(sFilter);
    },


    onConfirmAccDocumentType: function (oEvent) {
      var sPath = oEvent.getParameter("selectedItem").getBindingContextPath("detailDetailModel");
      var sAccountingDocumentType = this.getView().getModel("detailDetailModel").getProperty(sPath + "/AccountingDocumentType");
      this.getView().byId("idInvDocType").setValue(sAccountingDocumentType);
      this.getView().byId("idInvDocType").fireChangeEvent(sAccountingDocumentType);
    },

    onPartnerBankVH: function (oEvent) {
      this.oInput = oEvent.getSource();
      var oView = this.getView();

      //create dialog
      if (!this.getView().byId("idPartnerBankDialog_VH")) {
        //load asynchronous fragment (XML)
        Fragment.load({
          id: oView.getId(),
          name: "vim_ui.view.fragments.PartnerBank",
          controller: this
        }).then(function (oDialog) {
          //connect Menu to rootview of this component (models, lifecycle)
          oView.addDependent(oDialog);
          oDialog.open();
        });
      } else {
        this.getView().byId("idPartnerBankDialog_VH").open();
      }
    },
    onConfirmPartnerBank: function (oEvent) {
      //debugger;
      var oPath = oEvent.getParameter("listItem").getBindingContext("appmodel").sPath;
      var sKostl = oEvent.getParameter("listItem").getBindingContext("appmodel").getObject(oPath).value;
      this.oInput.setValue(sKostl);
      this.getView().byId("idPertnerBank_VH").removeSelections(true);
      this.getView().byId("idPartnerBankDialog_VH").close();
    },
    onCancelPartnerBankVH: function () {
      this.getView().byId("idPartnerBankDialog_VH").close();
    },

    /* WBS Element */

    onWBSElementVH: function (oEvent) {
      this.oInput = oEvent.getSource();
      var oView = this.getView();

      //create dialog
      if (!this.getView().byId("wbselementDialog")) {
        //load asynchronous fragment (XML)
        Fragment.load({
          id: oView.getId(),
          name: "vim_ui.view.fragments.WBSElement",
          controller: this
        }).then(function (oDialog) {
          //connect Menu to rootview of this component (models, lifecycle)
          oView.addDependent(oDialog);
          oDialog.open();
        });
      } else {
        this.getView().byId("wbselementDialog").open();
      }
    },

    onSearchWBSElem: function (oEvent) {
      // //debugger;
      var oDialog = this.getView().byId("wbselementDialog");
      var sTerm = oEvent.getParameter('value');

      sTerm = this.convertToPattern(sTerm);

      // build filter array
      var aFilter = [];
      if (sTerm) {
        aFilter.push(new Filter("Pspid", FilterOperator.EQ, sTerm));
      }

      // filter binding
      var oBinding = oDialog.getBinding("items");
      oBinding.filter(aFilter);

    },

    onConfirmWBSElem: function (oEvent) {
      var oPath = oEvent.getParameter("listItem").getBindingContext("WbsElementModel").sPath;
      var sSaknr = oEvent.getParameter("listItem").getBindingContext("WbsElementModel").getObject(oPath).WBSElement;
      this.oInput.setValue(sSaknr);
      this.getView().byId("wbselementDialog").getContent()[1].removeSelections(true);
      this.getView().byId("wbselementDialog").close();
    },

    onCancelWBSElem: function (oEvent) {
      this.getView().byId("wbselementDialog").close();
    },

    /* Value Helps End */


    _assignCssConfidence: function (sId, nConf) {
      var oView = this.getView();

      nConf = parseFloat(nConf);

      if (nConf <= 0.50) {
        oView.byId(sId).addStyleClass('cfl50');

      } else if (nConf > 0.50 && nConf < 0.80) {
        oView.byId(sId).addStyleClass('cfl80');

      } else if (nConf >= 0.80 && nConf <= 1) {
        oView.byId(sId).addStyleClass('cfl100');

      }
    },

    _removeCssConfidence: function (sId) {
      var oView = this.getView();

      oView.byId(sId).removeStyleClass('cfl50');
      oView.byId(sId).removeStyleClass('cfl80');
      oView.byId(sId).removeStyleClass('cfl100');

    },

    setPONumberForAllLines: function (PONum) {
      var oModel = this.getOwnerComponent().getModel("PurchaseOrderModel"),
        bMultiplePO = this.appmodel.getProperty("/detailDetail/header/bMultiplePO");

      if (!bMultiplePO) {
        if (PONum.length === 10) {
          // call odata to get PO details
          oModel.read("/A_PurchaseOrderItem", { //polineitemSet
            filters: [new Filter("PurchaseOrder", FilterOperator.EQ, PONum)], //Ebeln
            success: function (oData) {
              if (oData.results.length > 0) {
                var DocxLines = deepExtend([], this.appmodel.getProperty("/DocxLines"));
                for (let i = 0; i < DocxLines.length; i++) {
                  if (DocxLines[i] && oData.results[i]) {
                    DocxLines[i].UoM = oData.results[i].PurchaseOrderQuantityUnit //Meins
                    DocxLines[i].PONumber = PONum
                    DocxLines[i].POLineItem = oData.results[i].PurchaseOrderItem //Ebelp
                  }
                }
                this.appmodel.setProperty("/DocxLines", DocxLines);
              }
            }.bind(this),
            error: function (oErr) {
              console.log('auto po update error', oErr);
            }.bind(this)
          });

          // call odata to get PO Header => CompanyCode
          oModel.read("/A_PurchaseOrder(PurchaseOrder='" + PONum + "')", { //poheaderSet, Ebeln
            success: function (oData) {
              this.getView().byId("idCompanyCodeTxt").setText(oData.CompanyCode); //Bukrs
              console.log("POHeaderInitLoad", oData);
            }.bind(this),
            error: function (oErr) {
              console.log('auto po-header update error', oErr);
            }.bind(this)
          });
        } else {
          return;
        }
      } else {
        var aPOLines = this.appmodel.getProperty("/DocxLines");

        for (var i = 0; i < aPOLines.length; i++) {
          oModel.setDeferredGroups(["idPONumLineItemDetail"]);

          oModel.read("/A_PurchaseOrderItem", {
            groupId: "idPONumLineItemDetail",
            filters: [new Filter("PurchaseOrder", FilterOperator.EQ, aPOLines[i].PONumber)],
            success: function (oData) {
              if (oData.results.length > 0) {
                var DocxLines = deepExtend([], this.appmodel.getProperty("/DocxLines"));
                for (let i = 0; i < DocxLines.length; i++) {
                  for (let j = 0; j < oData.results.length; j++) {
                    if (DocxLines[i] && oData.results[j] && DocxLines[i].PONumber === oData.results[j].PurchaseOrder) {
                      DocxLines[i].UoM = oData.results[j].PurchaseOrderQuantityUnit //Meins                   
                      DocxLines[i].POLineItem = oData.results[j].PurchaseOrderItem //Ebelp
                      continue;
                    }
                  }
                }
                this.appmodel.setProperty("/DocxLines", DocxLines);
              }
            }.bind(this),
            error: function (oErr) {
              console.log('auto po update error', oErr);
            }.bind(this)
          });
        }

        oModel.submitChanges({
          groupId: "idPONumLineItemDetail",
          success: function (odata) {
            console.log("Batch call success ", odata);
          }.bind(this),
          error: function (oErr) {
            console.log("Error in batch call ", oErr);
          }.bind(this)
        });
      }
    },

    setPONumberForLine: function (PONum, sPath) {
      var oModel = this.getOwnerComponent().getModel("PurchaseOrderModel");

      this._sLocalPath = sPath;
      if (PONum.length === 10) {
        // call odata to get PO details
        oModel.read("/A_PurchaseOrderItem", { //polineitemSet
          filters: [new Filter("PurchaseOrder", FilterOperator.EQ, PONum)], //Ebeln
          success: function (oData) {
            if (oData.results.length > 0) {
              this.appmodel.setProperty(this._sLocalPath + "/UoM", oData.results[0].PurchaseOrderQuantityUnit);
              this.appmodel.setProperty(this._sLocalPath + "/POLineItem", oData.results[0].PurchaseOrderItem);
            }
          }.bind(this),
          error: function (oErr) {
            console.log('auto po update error', oErr);
          }.bind(this)
        });
      } else {
        return;
      }
    },

    readSavedDataOld: function () {
      // this.I_JOBID 
      // var hMap = deepExtend({}, this.appmodel.getProperty("/ui/header"));
      var aURL = baseManifestUrl + "/odata/getMetadata()?jobId=" + this.I_JOBID + "&$top=1";

      if (!this.I_JOBID) {
        console.log("JobID not passed");
        return null;
      }

      const oSuccessFunction = (data) => {
        // resolve with data
        var record = data.value[0].result.pop();
        var bPOMode = this.appmodel.getProperty("/props/POMode"),
          sPO = this.appmodel.getProperty("/detailDetail/header/purchaseOrderNumber/value"),
          bMultiplePO = false;
        if (bPOMode && (sPO === null || sPO === '' || sPO === undefined)) {
          bMultiplePO = true;
        }
        this.appmodel.setProperty("/detailDetail/header/bMultiplePO", bMultiplePO);
        if (bMultiplePO) {
          this.setPONumberForAllLines();
          this.bindTaxCode(this.getView(), this.getOwnerComponent().getModel("ApProcessModel"), null, null);
        }
        return record;
      };

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        console.log(errorThrown)
      };

      return this.executeRequest(aURL, 'GET', null, oSuccessFunction, oErrorFunction);
    },
    //Set DAR predictions

    restoreSavedData: function (data) {

      var oView = this.getView();
      var oApProcessModel = this.getOwnerComponent().getModel("ApProcessModel");

      if (!data) {
        return;
      }
      // var ui_data = data.Metadata.dox;
      var ui_data = JSON.parse(data.Metadata);
      var header = ui_data.header;
      var lines = ui_data.lines;

      // General Info
      oView.byId("idPurchaseOrder").setValue(header.Ebeln);
      var bMultiplePO = this.appmodel.getProperty("/detailDetail/header/bMultiplePO");
      if (bMultiplePO) {
        //this.setPONumberForAllLines();
        //this.bindPaymentTerms();

        // Do not set lines as it is assumed that PO has already been selected before save.
        // this.setPONumberForAllLines(header.Ebeln);
        this.appmodel.setProperty("/props/POMode", true);

        if (Array.isArray(lines)) {
          this.appmodel.setProperty("/DocxLines", lines);
        }
      } else if (header.Ebeln) {
        this.setPOMode(header.Ebeln);
        // Do not set lines as it is assumed that PO has already been selected before save.
        // this.setPONumberForAllLines(header.Ebeln);
        this.appmodel.setProperty("/props/POMode", true);
        if (Array.isArray(lines)) {
          this.appmodel.setProperty("/DocxLines", lines);
        }
      } else {
        this.appmodel.setProperty("/props/POMode", false);
        this.appmodel.setProperty("/props/NONPOModeGLaccount", true);

        this.bindTaxCode(oView, oApProcessModel, null, header.Bukrs);
        this.bindBankKey(oView, oApProcessModel, null, header.VendorNumber);

        if (Array.isArray(lines)) {
          this.appmodel.setProperty("/NonPoDocxLines", lines);
        }
      }

      oView.byId("idDocDate").setValue(moment(header.DocDt).format('YYYY-MM-DD'));
      oView.byId("idVendorInvoice").setValue(header.InvNum);
      oView.byId("idCompanyCodeTxt").setText(header.dBukrs);
      oView.byId("idCompanyCode").setValue(header.Bukrs);
      oView.byId("idSenderName").setValue(header.SenderName);
      oView.byId("idReceiverName").setValue(header.ReceiverName);
      oView.byId("idVendorNumber").setValue(header.VendorNumber);
      oView.byId("idDueDate").setValue(moment(header.DueDt).format('YYYY-MM-DD'));
      oView.byId("idCurrency").setValue(header.Curr);
      oView.byId("idFreeTxt").setValue(header.FreeTxt);
      oView.byId("idInvInd").setSelected(header.InvInd);
      // Amount
      oView.byId("idGrossAmt").setValue(header.GrossAmt);
      oView.byId("idDiscountAmt").setValue(header.DiscAmt);
      oView.byId("idNetAmt").setValue(header.NetAmt);
      oView.byId("idBankKey").setSelectedKey(header.PartBank);
      oView.byId("idPaymentTerms").setSelectedKey(header.PaymentTerms);
      this.appmodel.setProperty("/detailDetail/header/Bankn", header.Bankn);
      this.appmodel.setProperty("/detailDetail/header/Bankl", header.Bankl);
      this.appmodel.setProperty("/detailDetail/header/IBAN", header.IBAN);
      oView.byId("idInvDocType").setValue(header.InvDocTyp);
      // Tax
      // //debugger;
      oView.byId("idTaxExemptAmt").setValue(header.TaxExemptAmt);
      oView.byId("idHTaxAmt").setValue(header.TaxAmt);
      oView.byId("idTaxCode").setSelectedKey(header.TaxCode);
      oView.byId("idCalcTaxInd").setSelected(header.CalcTaxInd);
      // Unplanned Freight
      oView.byId("idShippingAmount").setValue(header.DelivAmt);
    },

    _computeFieldsMapper: function (field) {
      var hMap = deepExtend({}, this.appmodel.getProperty("/ui/header"));
      // //debugger;
      if (hMap[field.name]) { // hMap['purchaseOrderNumber']
        // //debugger;
        var sContext = "/detailDetail/header/" + field.name;
        this.appmodel.setProperty(sContext, field);
        this._assignCssConfidence(hMap[field.name].id, field.confidence)

        if (field.name === 'purchaseOrderNumber') {
          this.setPOMode(field.value);
          this.setPONumberForAllLines(field.value);

          // this.getView().byId("idPurchaseOrder").setTooltip(this.formatter.genTooltip(field));
          // var toolCtl = this.getView().byId("idPurchaseOrder").getTooltip();
          // //debugger;
          // toolCtl.setOpenDelay(2);
          // this.getView().byId("idPurchaseOrder").setTooltip(toolCtl);
        }
      }
    },

    _computeFields: function (data) {

      this.executeRequest();
      return new Promise(function (resolve, reject) {
        console.log("dox", data);

        var aLineItems = [];
        var aLineItems2 = [];

        // compute line items for PO based
        data.extraction.lineItems.forEach(function (line, idx) {
          var obj = {
            "InvoiceLineItem": idx + 1,
            "Description": null,
            "Amount": null,
            "Currency": null,
            "Quantity": 1,
            "UoM": null,
            "PONumber": null,
            "POLineItem": null,
            "TaxCode": null,
            "TaxName": null,
          }
          for (let i = 0; i < line.length; i++) {

            //  map PO number in case of multiple PO scenario
            if (line[i].name === 'PONumber') {
              obj.PONumber = line[i].value;
            }

            //  map description
            if (line[i].name === 'description') {
              obj.Description = line[i].value;
            }

            //  map netAmount
            if (line[i].name === 'netAmount') {
              obj.Amount = line[i].value;
            }

            //  map quantity
            if (line[i].name === 'quantity') {
              obj.Quantity = line[i].value;
            }

          }
          aLineItems.push(obj);
        }.bind(this));

        // compute line items for Non-PO based
        data.extraction.lineItems.forEach(function (line, idx) {
          var DocCategory = this.appmodel.getProperty("/detail/header/DOCCATEGORY");
          var type = "false";

          // find type;
          if (DocCategory === "Non-PO Invoice") {
            type = "false"
          } else if (DocCategory === "PO Invoice") {
            type = "false";
          } else if (DocCategory === "Non-PO Credit Memo") {
            type = "true";
          } else if (DocCategory === "PO Credit Memo") {
            type = "true";
          }

          var obj = {
            "InvoiceLineItem": idx + 1,
            "Description": null,
            "CDInd": type,
            "CompanyCode": null,
            "Amount": null,
            "Currency": null,
            "Quantity": 1,
            "TaxCode": null,
            "TaxAmount": null,
            "UoM": null,
            "Bukrs": null,
            "GLAcc": null,
            "WBSElem": null,
            "ProfitCen": null,
          }
          // //debugger;
          for (let i = 0; i < line.length; i++) {
            // //debugger;
            //  map description
            if (line[i].name === 'description') {
              obj.Description = line[i].value;
            }

            //  map netAmount
            if (line[i].name === 'netAmount') {
              obj.Amount = line[i].value;
            }

            //  map quantity
            if (line[i].name === 'quantity') {
              obj.Quantity = line[i].value;
            }
          }
          aLineItems2.push(obj);
        }.bind(this));

        this.appmodel.setProperty("/DocxLines", aLineItems);
        this.appmodel.setProperty("/valuehelps/multiplePOValueHelp", aLineItems)
        this.appmodel.setProperty("/NonPoDocxLines", aLineItems2);

        // compute document header fields
        data.extraction.headerFields
          .map(this._computeFieldsMapper.bind(this));

        resolve(1);

        // setTimeout(function (){
        //   resolve(1)
        // }, 1000);

      }.bind(this));

    },

    onCredMemoToggle: function (oEvent) {
      var isSelected = oEvent.getParameter("selected");

      var oNonPOLines = this.appmodel.getProperty("/NonPoDocxLines");

      if (isSelected) {
        oNonPOLines = oNonPOLines.map(function (obj) {
          obj.CDInd = "true";
          return obj;
        });

        this.appmodel.setProperty("/NonPoDocxLines", oNonPOLines);
      } else {
        // Non PO Based
        oNonPOLines = oNonPOLines.map(function (obj) {
          obj.CDInd = "false";
          return obj;
        });

        this.appmodel.setProperty("/NonPoDocxLines", oNonPOLines);
      }

      // setTimeout(function () { CAP refactory: not present in functional analysis
      //   this.calcTotals()
      // }.bind(this), 3000);

    },

    onCalcTax: function (oEvent) {
      var isSelected = oEvent.getParameter("selected");

      var oPOLines = this.appmodel.getProperty("/DocxLines");
      var oNonPOLines = this.appmodel.getProperty("/NonPoDocxLines");

      var sTaxCode = this.getView().byId("idTaxCode").getSelectedKey();

      if (isSelected) {
        // clear values om tax amt if checked
        this.getView().byId("idHTaxAmt").setEditable(false);
        this.getView().byId("idHTaxAmt").setValue(null);

        // PO Based
        oPOLines = oPOLines.map(function (obj) {
          obj.TaxCode = sTaxCode;
          return obj;
        });

        // Non PO Based
        oNonPOLines = oNonPOLines.map(function (obj) {
          obj.TaxCode = sTaxCode;
          return obj;
        });

        this.appmodel.setProperty("/DocxLines", oPOLines);
        this.appmodel.setProperty("/NonPoDocxLines", oNonPOLines);
      } else {
        this.getView().byId("idHTaxAmt").setEditable(true);
        // PO Based
        oPOLines = oPOLines.map(function (obj) {
          obj.TaxCode = null;
          return obj;
        });

        // Non PO Based
        oNonPOLines = oNonPOLines.map(function (obj) {
          obj.TaxCode = null;
          return obj;
        });

        this.appmodel.setProperty("/DocxLines", oPOLines);
        this.appmodel.setProperty("/NonPoDocxLines", oNonPOLines);
      }
    },

    calcTotals: function () {
      var total = 0;
      var doclines;

      function mapCalcTotalFn(Amount) {
        if (isNaN(Amount) === false) {
          total = total + Amount;
        }
      }
      function mapCalcTotalFn2(obj) {
        if (isNaN(obj.Amount) === false) {
          total = total + (obj.Amount * obj.Sign);
        }
      }

      if (this.appmodel.getProperty("/props/POMode")) {

        doclines = this.getView().byId("idInvLineItemTable").getItems();
        doclines = doclines.map(function (item) {

          if (item.getCells()[2].getMetadata()._sClassName === "sap.m.Input") {
            return parseFloat(item.getCells()[2].getValue());
          }
          if (item.getCells()[2].getMetadata()._sClassName === "sap.m.Text") {
            return parseFloat(item.getCells()[2].getText());
          }

        });

        doclines.map(mapCalcTotalFn);

      } else {
        // let sId = this.appmodel.getProperty("/props/NONPOModeGLaccount") ? 'idNPOInvGLAccountLineTable' : 'idNPOInvAssetLineTable';
        let sId = 'idNPOInvGLAccountLineTable';
        doclines = this.getView().byId(sId).getItems();
        doclines = doclines.map(function (item) {
          if (item.getCells()[4].getMetadata()._sClassName === "sap.m.Input") {
            return {
              Amount: parseFloat(item.getCells()[4].getValue()),
              Sign: item.getCells()[1].getSelectedKey() === "false" ? -1 : 1
            };
          }
          if (item.getCells()[4].getMetadata()._sClassName === "sap.m.Text") {
            return {
              Amount: parseFloat(item.getCells()[4].getText()),
              Sign: item.getCells()[1].getText() === "Debit" ? -1 : 1
            };
          }
        });

        doclines.map(mapCalcTotalFn2);

      }
      // Get amounts
      var gross = parseFloat(this.byId("idGrossAmt").getValue()) ? parseFloat(this.byId("idGrossAmt").getValue()) : 0;
      var del_cost = parseFloat(this.byId("idShippingAmount").getValue()) ? parseFloat(this.byId("idShippingAmount").getValue()) : 0;
      var h_tax = parseFloat(this.byId("idHTaxAmt").getValue()) ? parseFloat(this.byId("idHTaxAmt").getValue()) : 0;

      // get positive value irrespective of debit/credit
      total = Math.abs(total);
      var balance = gross - (total + del_cost + h_tax);

      balance = balance.toFixed(2);
      this.appmodel.setProperty("/props/totalAmount", balance);
    },

    _onRouteMatched: function (oEvent) {
      // Define the model for the current page
      this.defineModelForCurrentPage();
      // Get package ID from the event or fallback to a default value
      this._packageId = oEvent.getParameter("arguments").packageId || this._packageId || "0";
      // Get data from backend and bind them to the controls
      this._getData();
      // Start auto-lock refresh logic for the UI
      this.startAutoLockRefresh();
    },

    _getData: function () {
      // Get the detail model and reset the UI state
      var oDetailDetailModel = this.getView().getModel("detailDetailModel");
      this.resetUIState();
      // Set the page as busy
      this.getView().byId('DDPage').setBusy(true);
      // Fetch data based on the package ID and handle further actions
      this.fetchData(this._packageId)
        .then(this.fetchSelectTransactionValues.bind(this))
        .then(this.readSavedData.bind(this)) // Fetch saved data from the backend
        .then(function () {
          this.getView().byId('DDPage').setBusy(false); // Once done, mark the page as not busy
          // Toggle MessagePopover for showing messages and notifications if there are errors
          if (this.getView().getModel("detailDetailModel").getProperty("/errorLog").length > 0) {
            this.handleMessagePopoverPress();
          }
        }.bind(this))
        .catch(function (error) {
          console.log(error); // Handle errors during the process
          this.getView().byId('DDPage').setBusy(false); // Ensure to reset busy state
        }.bind(this));

      // Fetch currency data and update the model
      this.fetchCurrency()
        .then(function (oData) {
          oDetailDetailModel.setProperty("/valuehelps/currency", oData); // Store the fetched currencies
        }.bind(this));

      // Fetch notes related to the package and handle errors if any
      this.fetchNotes(this._packageId)
        .catch(function (error) {
          console.log('Notes fetch error', error);
        });

      // Bind payment terms to the UI 
      this.bindPaymentTerms();
    },

    // Function to fetch data for the provided package ID
    fetchData: function (packageId) {
      if (!packageId) {
        console.log("packageId not passed");
        return null;
      }

      this.I_PACKAGEID = packageId; // Set the package ID as a global variable
      var aURL = baseManifestUrl + "/odata/extended()?PACKAGEID=" + packageId; // Create API URL
      var oDetailDetailModel = this.getView().getModel("detailDetailModel");

      const oSuccessFunction = (data) => {
        var record = data.value[0].result[0]; // Extract relevant record
        var type = record.DOCCATEGORY; // Determine the document category

        // Update the header data in the model
        oDetailDetailModel.setProperty("/detail/header", record);

        // Determine if the document is a PO or NON-PO invoice and update the model accordingly
        if (type && (type === 'Non-PO Invoice' || type === 'Non-PO Credit Memo')) {
          oDetailDetailModel.setProperty("/props/POMode", false); // Non-PO mode
          oDetailDetailModel.setProperty("/props/NONPOModeGLaccount", true);
        } else {
          oDetailDetailModel.setProperty("/props/POMode", true); // PO mode
        }
        return record;
      };

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        console.log(errorThrown);
      };

      return this.executeRequest(aURL, 'GET', null, oSuccessFunction, oErrorFunction);
    },

    // Function to fetch data for the provided package ID
    fetchSelectTransactionValues: function () {
      var aURL = baseManifestUrl + "/odata/getTransactionData()"; // Create API URL
      var oDetailDetailModel = this.getView().getModel("detailDetailModel");

      const oSuccessFunction = (data) => {
        var record = data.value[0].result; // Extract relevant record
        var aTransaction = [];
        aTransaction = record.map(item => {
          return {transactionKey : item.replace(" ",""), transactionValue: item}
        })

        // Update the data in the model
        oDetailDetailModel.setProperty("/transactionData", aTransaction);
        return record;
      };

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        console.log(errorThrown);
      };

      return this.executeRequest(aURL, 'GET', null, oSuccessFunction, oErrorFunction);
    },

    /**
     * Merge oHeaderInvoiceItalianTrace and oHeaderInvoiceIntegrationInfo in one header
     */
    _assemblyInvoiceHeaders: function (oHeaderInvoiceItalianTrace, oHeaderInvoiceIntegrationInfo) {
      return Object.assign({}, oHeaderInvoiceItalianTrace, oHeaderInvoiceIntegrationInfo);
    },

    /**
     * Merge every object belonging to datiBeniServizi_DettaglioLinee either to oBodyPOInvoiceIntegrationInfo record or oBodyGLAccountIntegrationInfo record
     * depending from ID matches
     */
    _assemblyInvoiceBodies: function (oBodyInvoiceItalianTrace, oBodyPOInvoiceIntegrationInfo, oBodyGLAccountIntegrationInfo) {
      oBodyInvoiceItalianTrace.datiBeniServizi_DettaglioLinee = oBodyInvoiceItalianTrace.datiBeniServizi_DettaglioLinee.map(oLineDetail => {
        // If there are no referements to PO or GL Account line detail then return oLineDetail
        if (oLineDetail.bodyPOIntegrationInfo_ID === null && oLineDetail.bodyGLAccountIntegrationInfo_ID === null) {
          return oLineDetail;
        }

        oBodyPOInvoiceIntegrationInfo.forEach(oPOItem => {
          // If LineDetail is PO
          if (oLineDetail.bodyPOIntegrationInfo_ID === oPOItem.ID) {
            // renaming ID in order to avoid issues during body merge operation
            oPOItem.ID_bodyPOInvoiceIntegrationInfo = oPOItem.ID;
            delete oPOItem.ID;
            // removing useless key
            delete oBodyPOInvoiceIntegrationInfo.navigation_to;
            return Object.assign({}, oLineDetail, oPOItem);
          }
        })

        oBodyGLAccountIntegrationInfo.forEach(oGLAccountItem => {
          // If LineDetail is GL Account
          if (oLineDetail.bodyGLAccountIntegrationInfo_ID === oGLAccountItem.ID) {
            // renaming ID in order to avoid issues during body merge operation
            oBodyGLAccountIntegrationInfo.ID_bodyGLAccountIntegrationInfo = oBodyGLAccountIntegrationInfo.ID;
            delete oBodyGLAccountIntegrationInfo.ID;
            // removing useless key
            delete oBodyGLAccountIntegrationInfo.navigation_to;
            return Object.assign({}, oLineDetail, oGLAccountItem);
          }
        })
      });
      return oBodyInvoiceItalianTrace;
    },

    // Function to read saved data from the backend for the current package
    readSavedData: function () {
      var aURL = baseManifestUrl + "/odata/getInvoice()?PackageId=" + this.I_PACKAGEID;
      var oDetailDetailModel = this.getView().getModel("detailDetailModel");

      const oSuccessFunction = (data) => {
        try {
          var record = data.value[0].result, // Get the main record
            
            bPOMode = oDetailDetailModel.getProperty("/props/POMode"), // Check if in PO mode
            bMultiplePO = false, // Flag for multiple POs
            sPOnumber = null, // PO number
            oApProcessModel = this.getOwnerComponent().getModel("ApProcessModel");
            oDetailDetailModel.setProperty("/errorLog", record.ErrorLog);
            delete record.ErrorLog
            oDetailDetailModel.setProperty("/currentInvoice", record);
            oDetailDetailModel.setProperty("/valuehelps/multiplePOValueHelp", record.PORecords);
          

          oDetailDetailModel.setProperty("/props/bMultiplePO", bMultiplePO);
          if (bMultiplePO) {
            this.bindTaxCode(this.getView(), oApProcessModel, null, null);

          } else if (!sPOnumber) {
            this.setPOMode(sPOnumber);
          }
          let sTransactionKey = record.Transaction;
          if (sTransactionKey) {
            let oSelectTransaction = this.getView().byId("idTransaction"),
              oItem = oSelectTransaction.getItemByKey(sTransactionKey);
            oSelectTransaction.setSelectedItem(oItem);
          }

          if (bPOMode) {
            let sRefDocumentCategoryKey = record.RefDocumentCategory;
            if (sRefDocumentCategoryKey) {
              let oSelectRefDocumentCategory = this.getView().byId("idRefDocCategory"),
                oItem = oSelectRefDocumentCategory.getItemByKey(sRefDocumentCategoryKey);
              oSelectRefDocumentCategory.setSelectedItem(oItem);
              this._removeAllRefDocumentCategoryValues(sRefDocumentCategoryKey);
            }
          }


          return (record);
        } catch (error) {
          console.log(error);
          MessageBox.error(oBundle.getText("ErrorLoadingInvoiceData"));
        }
      };

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        console.log(errorThrown);
      };

      return this.executeRequest(aURL, 'GET', null, oSuccessFunction, oErrorFunction);
    },

    _fullReload: function () {
      // //debugger;
      this.resetUIState();
      this.getView().byId('DDPage').setBusy(true);
      // this._packageId = oEvent.getParameter("arguments").packageId || this._packageId || "0";
      this.fetchData(this._packageId)
        .then(this.readSavedData.bind(this)) // Fetch saved data from the backend
        .then(function () {
          this.getView().byId('DDPage').setBusy(false);
        }.bind(this))
        .catch(function (error) {
          console.log(error);
          this.getView().byId('DDPage').setBusy(false);
        }.bind(this));

      this.fetchCurrency()
        .then(function (oData) {
          this.appmodel.setProperty("/valuehelps/currency", oData)
        }.bind(this));


      this.fetchNotes(this._packageId)
        .catch(function (error) {
          console.log('Notes fetch error', error);
        });

      this.fetchFileList(this._packageId)
        .catch(function (error) {
          console.log('File List fetch error', error);
        });

      this.startAutoLockRefresh();
    },

    // Function to start or stop the auto-lock refresh loop, which periodically checks the lock status of a package
    startAutoLockRefresh: function () {
      // Toggle the value of 'keepGoing', which controls whether the loop continues or stops
      this.keepGoing = !this.keepGoing;  // Flip the boolean value

      var that = this;  // Store the reference to 'this' for use inside inner functions

      // Function that performs the loop and checks the lock status every 60 seconds
      function myLoop() {
        console.log("Auto Refresh started");  // Log that auto-refresh has started
        that.getLockStatus(that._packageId);  // Call function to check the lock status of the package

        // If 'keepGoing' is still true, schedule the next iteration of the loop after 60 seconds
        if (that.keepGoing) {
          setTimeout(myLoop, 60000);  // 60000 milliseconds = 60 seconds
        }
      }

      // Function to start the looping process
      function startLoop() {
        that.keepGoing = true;  // Set 'keepGoing' to true, ensuring the loop continues
        myLoop();  // Initiate the first loop
      }

      // Function to stop the looping process
      function stopLoop() {
        that.keepGoing = false;  // Set 'keepGoing' to false, stopping the loop
      }

      // Conditional logic to either start or stop the loop based on the current value of 'keepGoing'
      if (this.keepGoing) {
        startLoop();  // Start the loop if 'keepGoing' is true
        // Optionally, display a message to indicate auto-sync has started
        // sap.m.MessageToast.show("Auto-sync : Started");
      } else {
        stopLoop();  // Stop the loop if 'keepGoing' is false
        // Optionally, display a message to indicate auto-sync has stopped
        // sap.m.MessageToast.show("Auto-sync : Stopped");
      }
    },

    getLockStatus: function (packageId) {
      // Check if packageId is provided, log error and return null if not
      if (!packageId) {
        console.log("packageId not passed");
        return null;
      }

      // Construct the URL for the OData service call with the provided packageId
      var aURL = baseManifestUrl + "/odata/lockStatus()?PackageId=" + packageId;

      // Get the 'detailDetailModel' from the view's model for future data binding
      var oDetailDetailModel = this.getView().getModel("detailDetailModel");

      const oSuccessFunction = (data) => {
        // Log the lock status data received from the service
        console.log("Lock:", data);

        // Update the 'lock' property in the 'detailDetailModel' with the result
        oDetailDetailModel.setProperty("/lock", data.value[0].result);

        return data;
      };

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        console.log(errorThrown);
      };

      return this.executeRequest(aURL, 'GET', null, oSuccessFunction, oErrorFunction);
    },

    onPOInputChange: function (oEvent) {
      // //debugger;
      var sValue = oEvent.getParameter("value");
      var jobId = this.appmodel.getProperty("/detail/header/JOBID");
      var c_mode = this.appmodel.getProperty("/detail/header/DOCCATEGORY");

      // Reverse mode to update mode
      if (c_mode === "Non-PO Invoice") {
        c_mode = "POINV"
      } else if (c_mode === "PO Invoice") {
        c_mode = "NONPOINV";
      } else if (c_mode === "Non-PO Credit Memo") {
        c_mode = "POCREDM";
      } else if (c_mode === "PO Credit Memo") {
        c_mode = "NONPOCREDM";
      }

      var url = "/odata/removeJob";
      var oBody = {
        payload: {
          PackageId: this._packageId,
          JobId: jobId,
          Mode: c_mode
        }
      }

      // If removing PO number completely
      if (!sValue || sValue.trim().length <= 0) {
        var msg = oBundle.getText("SwitchInvoiceTypeAlertToNonPo"),
          textButton = oBundle.getText("SwitchInvoiceTypeButton");

        if (this.appmodel.getProperty("/props/POMode")) {
          MessageBox.warning(msg, {
            actions: [textButton, MessageBox.Action.CLOSE],
            emphasizedAction: textButton,
            onClose: function (sAction) {
              if (sAction === textButton) {
                $.ajax({
                  url: url,
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "cache": false,
                  },
                  dataType: "json",
                  data: JSON.stringify(oBody),
                  async: false,
                  success: function (data) {
                    console.log("Switch Invoice Type: ", data);
                    MessageToast.show(oBundle.getText("SwitchingInvoiceType"), data);
                    // this.fetchFileList(this._packageId);
                    this._fullReload();
                    var bus = this.getOwnerComponent().getEventBus();
                    bus.publish("reload");
                    this._confirmCancelEdit();
                  }.bind(this),
                  error: function (err) {
                    console.log("Switch Invoice Type Error: ", err);
                    MessageToast.show(oBundle.getText("ErrorSwitching"), err);
                  }.bind(this)
                });
              } else {
                // oEvent.getSource().setSelected(false);
              }
            }.bind(this)
          });
        }
      } else {
        var msg = oBundle.getText("SwitchInvoiceTypeAlertToPo");
        // either user is switching from NON PO to PO
        if (!this.appmodel.getProperty("/props/POMode")) {
          MessageBox.warning(msg, {
            actions: [textButton, MessageBox.Action.CLOSE],
            emphasizedAction: textButton,
            onClose: function (sAction) {
              if (sAction === textButton) {
                this.setPOMode(sValue);
                this.setPONumberForAllLines(sValue);
                $.ajax({
                  url: url,
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "cache": false,
                  },
                  dataType: "json",
                  data: JSON.stringify(oBody),
                  async: false,
                  success: function (data) {
                    console.log("Switch Invoice Type: ", data);
                    MessageToast.show(oBundle.getText("SwitchingInvoiceType"), data);
                    this._fullReload();
                    var bus = this.getOwnerComponent().getEventBus();
                    bus.publish("reload");
                    this._confirmCancelEdit();
                  }.bind(this),
                  error: function (err) {
                    console.log("Switch Invoice Type Error: ", err);
                    MessageToast.show(oBundle.getText("ErrorSwitching"), err);
                  }.bind(this)
                });
              } else {
                // oEvent.getSource().setSelected(false);
              }
            }.bind(this)
          });
        } else if (sValue.length === 10) {
          // User is in PO mode, but is updating the PO number (10 chars)
          // then call below function to auto-fill companycode, line items (polineitem)
          this.setPONumberForAllLines(sValue);
          this.setPOMode(sValue);
        }
      }
    },

    onFileListEdit: function (oEvent) {
      var isPressed = oEvent.getParameter("pressed");
      var oDetailDetailModel = this.getView().getModel("detailDetailModel");
      if (isPressed) {
        oDetailDetailModel.setProperty("/props/FileEditMode", true)
      } else {
        oDetailDetailModel.setProperty("/props/FileEditMode", false)
      }
    },

    _confirmAssignation: function (sUrl, body) {
      const oSuccessFunction = (data) => {
        MessageBox.success(oBundle.getText("SuccessfullyAssigned"), {
          actions: [MessageBox.Action.CLOSE],
          title: "Success",
          details: data,  // Provide details of the response
          styleClass: sResponsivePaddingClasses,
          onClose: function () {
            this._getData();
          }.bind(this)
        });
      };

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        sap.ui.core.BusyIndicator.hide();
        let sMsg = oBundle.getText("UnexpectedErrorOccurred");
        MessageToast.show(sMsg);
        console.log(errorThrown);
        this._getData();
      };

      return this.executeRequest(sUrl, 'POST', JSON.stringify(body), oSuccessFunction, oErrorFunction);
    },

    onAssignConfirm: function (oEvent) {
      var that = this;
      var sUrl;
      var assignTo = oEvent.getParameter('selectedItem').getBindingContext('UserList').getObject('Email');
      var body = undefined;

      sUrl = baseManifestUrl + '/odata/assign';
      body = {
        payload: {
          PackagesId: [this._packageId],
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

    onFileListMainSelect: function (oEvent) {
      var jobId = oEvent.getSource().getParent().getBindingContext('appmodel').getObject('JobId');
      var packageId = oEvent.getSource().getParent().getBindingContext('appmodel').getObject('PackageId');
      var fileName = oEvent.getSource().getParent().getBindingContext('appmodel').getObject('FileName');
      var oBody = {
        payload: {
          PackageId: packageId,
          JobId: jobId
        }
      }

      if (oEvent.getParameter('selected')) {
        var msg = oBundle.getText("SwitchPrimaryDocumentAlert", [fileName]);
        if (!this.appmodel.getProperty('/props/gEditMode')) {
          msg = oBundle.getText("SwitchPrimaryDocumentConfirmAlert", [fileName]);
        }

        var url = baseManifestUrl + "/odata/setMainJob";
        var textButton = oBundle.getText("SwitchPrimaryDocumentButton");

        MessageBox.warning(msg, {
          actions: [textButton, MessageBox.Action.CLOSE],
          emphasizedAction: textButton,
          onClose: function (sAction) {

            if (sAction === textButton) {
              $.ajax({
                url: url,
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Accept": "application/json",
                  "cache": false,
                },
                dataType: "json",
                data: JSON.stringify(oBody),
                async: false,
                success: function (data) {

                  console.log("Switch Main Job Response: ", data);
                  MessageToast.show(oBundle.getText("SwitchingPrimaryDocument"), data);
                  // this.fetchFileList(this._packageId);
                  this._fullReload();
                  var bus = this.getOwnerComponent().getEventBus();
                  bus.publish("reload");
                }.bind(this),
                error: function (err) {

                  console.log("Switch Main Job Error: ", err);
                  MessageToast.show(oBundle.getText("ErrorSwitching"), err);
                  this.fetchFileList(this._packageId);
                }.bind(this)
              });

            } else {
              // oEvent.getSource().setSelected(false);
              this.fetchFileList(this._packageId);
            }

          }.bind(this)
        });
      }
    },

    handleFileChange: function (oEvent) {
      var oDetailDetailModel = this.getView().getModel("detailDetailModel"),
        aFiles = oEvent.getParameter("files");  // Get the list of files


      if (aFiles && aFiles.length) {
        var oFile = aFiles[0],  // Get the first file
          sHeader_Id_ItalianInvoiceTrace = this.getView().getModel("detailDetailModel").getProperty("/currentInvoice/header_Id_ItalianInvoiceTrace"),
          sCompanyCode = this.getView().getModel("detailDetailModel").getProperty("/detail/header/COMPANYCODE"),
          sFiscalYear = this.getView().getModel("detailDetailModel").getProperty("/detail/header/FISCALYEAR"),
          sName = oFile.name,
          sExtension = this._getExtensionType(oFile.type.toLowerCase()),
          sType = oFile.type,
          oReader = new FileReader(),
          sInvoiceReference = this.getView().getModel("detailDetailModel").getProperty("/detail/header/INVOICEREFERENCE"),
          sPackageId = this._packageId;

        if (sName.length > 60) {
          MessageBox.error(oBundle.getText("AttachmentUploadingNameLengthError"), {
            actions: [MessageBox.Action.CLOSE],
            title: "Error",
            styleClass: sResponsivePaddingClasses,
            onClose: function () {
              this.getView().byId("fileUploader").clear();
            }.bind(this)
          });
        } else {
          // Define what to do when file is successfully read
          oReader.onload = function (oEvent) {
            var sBase64 = oEvent.target.result;  // The Base64 encoded file content
            // If you want only the base64 part, remove the prefix like "data:image/png;base64,"
            var sBase64Data = sBase64.split(",")[1];
            // Set property model NewUploadedFile
            oDetailDetailModel.setProperty("/NewUploadedFile", {
              "PackageId": sPackageId,
              "CompanyCode": sCompanyCode,
              "ReferenceDocument": sInvoiceReference,
              "FiscalYear": sFiscalYear,
              "Header_Id_ItalianInvoiceTrace": sHeader_Id_ItalianInvoiceTrace,
              "AttachmentName": sName,
              "AttachmentType": sType,
              "AttachmentExtension": sExtension,
              "Attachment": sBase64Data
            });
          };

          // Read the file as Data URL to get Base64
          oReader.readAsDataURL(oFile);
        }       
      }
    },

    handleUploadPress: function (oEvent) {
      var oFileUploader = this.getView().byId("fileUploader"),
        oNewUploadedFile = this.getView().getModel("detailDetailModel").getProperty("/NewUploadedFile"),
        oBody = {
          payload: oNewUploadedFile
        },
        table = this.getView().byId("idFileList"),
        sUrl = baseManifestUrl + `/odata/addAttachment`;

      if (oFileUploader.getValue() !== '') {

        const oSuccessFunction = (data) => {
          console.log(data);  // Log the successful response
          table.setBusy(false);
          // Show success message to the user
          MessageBox.success(oBundle.getText("AttachmentUploadedSuccessfully"), {
            actions: [MessageBox.Action.CLOSE],
            title: "Success",
            details: data,  // Provide details of the response
            styleClass: sResponsivePaddingClasses,
            onClose: function () {
              // this.fetchFileList(this._packageId);
              this.getDetailController().fetchAttachments(this._packageId);
              this._getData();
            }.bind(this)
          });
          oFileUploader.clear();
        };

        const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
          console.log(errorThrown);  // Log the error

          table.setBusy(false);
          // Show error message to the user
          MessageBox.error(oBundle.getText("UnexpectedErrorOccurred"), {
            title: "Error",
            details: errorThrown,  // Provide error details
            styleClass: sResponsivePaddingClasses
          });
          oFileUploader.clear();
        };

        oFileUploader.checkFileReadable()
          .then(function () {
            table.setBusy(true);
            this.executeRequest(sUrl, 'POST', JSON.stringify(oBody), oSuccessFunction, oErrorFunction);
          }.bind(this), function (error) {
            table.setBusy(false);
            MessageToast.show(oBundle.getText("FileUploadError"));
          }).then(function () {
            oFileUploader.clear();
          }.bind(this));
      }
    },

    // handleUploadComplete: function (oEvent) {
    //   var that = this;
    //   this.getView().byId("idFileList").setBusy(false);
    //   var oParams = oEvent.getParameters();
    //   var sKey = JSON.parse(oParams.responseRaw).key;

    //   if (sKey) {
    //     var sMessage = oParams.status === 200 ? " Upload Success" + sKey : "Upload Error" + sKey;
    //     MessageToast.show(sMessage);
    //   }

    //   if (oParams.status === 200) {
    //     var aURL = "/odata/addDoc";

    //     var oPayload = {
    //       payload: [{
    //         PackageId: this._packageId,
    //         JobId: uid(),
    //         FileName: sKey.split("/").pop(),
    //         ObjectStoreRef: sKey
    //       }]
    //     };
    //     $.ajax({
    //       url: aUrl,
    //       method: "POST",
    //       headers: {
    //         "Content-Type": "application/json",
    //         "Accept": "application/json",
    //         "cache": false,
    //       },
    //       dataType: "json",
    //       data: JSON.stringify(oPayload),
    //       async: false,
    //       success: function (data) {
    //         console.log("Payload for upload", data);
    //         MessageToast.show("Document posted", data);
    //         that.fetchFileList(that._packageId);
    //       },
    //       error: function (err) {
    //         console.log(err);
    //         MessageToast.show("Posting error", err);
    //         that.fetchFileList(that._packageId);
    //       }
    //     });

    //   }
    // },

    bindPaymentTerms: function () {
      var oDetailDetailModel = this.getView().getModel("detailDetailModel");
      var oModel = this.getOwnerComponent().getModel("BillGDocModel");
      oModel.read("/CustomerPaymentTerms", {
        success: function (oData) {
          // add blank value in the beginning.
          // oData.results.unshift({
          //   CustomerPaymentTerms: ""
          // });
          oDetailDetailModel.setProperty("/valuehelps/paymentterms", oData.results);
        }.bind(this),
        error: function (oErr) {
          console.log('paymentterms error', oErr);
        }
      });
    },

    bindTaxCode: function (oView, oModel, sEbeln, sBukrs) {
      if (this.appmodel.getProperty("/detailDetail/header/bMultiplePO")) {
        oModel.read("/ZCE_GET_TAXCODESET", {
          success: function (oData) {
            // add blank value in the beginning.
            oData.results.unshift({
              Taxcode: "",
              Text: ""
            });
            this.appmodel.setProperty("/valuehelps/taxcode", oData.results);
          }.bind(this),
          error: function (oErr) {
            console.log('taxcode error', oErr);
          }
        });
      } else if (sEbeln) {
        oModel.read("/ZCE_GET_TAXCODESET", {
          filters: [new Filter("Ebeln", FilterOperator.EQ, sEbeln)],
          success: function (oData) {
            // add blank value in the beginning.
            oData.results.unshift({
              Taxcode: "",
              Text: ""
            });
            this.appmodel.setProperty("/valuehelps/taxcode", oData.results);
          }.bind(this),
          error: function (oErr) {
            console.log('taxcode error', oErr);
          }
        });
      } else if (sBukrs) {
        oModel.read("/ZCE_GET_TAXCODESET", {
          filters: [new Filter("Bukrs", FilterOperator.EQ, sBukrs)],
          success: function (oData) {
            // add blank value in the beginning.
            oData.results.unshift({
              Taxcode: "",
              Text: ""
            });
            this.appmodel.setProperty("/valuehelps/taxcode", oData.results);
          }.bind(this),
          error: function (oErr) {
            console.log('taxcode error', oErr);
          }
        });
      }
    },

    onHeaderTaxCodeSelect: function (oEvent) {
      this.getView().byId("idCalcTaxInd").setSelected(false);
    },

    bindBankKey: function (oView, oModel, sEbeln, sLifnr) {
      // clear all
      oView.byId("idBankKey").setSelectedKey(null);
      oView.byId("bankntxt").setText(null);
      oView.byId("routingtxt").setText(null);
      oView.byId("ibantxt").setText(null);

      if (sEbeln) {
        oModel.read("/ZCE_SUPPLIER_BANK", {
          filters: [new Filter("Ebeln", FilterOperator.EQ, sEbeln)],
          success: function (oData) {
            // If there is only one value in the response
            // if (oData.results.length === 1) {
            //   oView.byId("idBankKey").setSelectedKey(oData.results[0].Bvtyp);
            // }

            // add blank value in the beginning.
            oData.results.unshift({
              bankl: "",
              bvtyp: ""
            });
            this.appmodel.setProperty("/valuehelps/partbank", oData.results);
          }.bind(this),
          error: function (oErr) {
            console.log('partbank error', oErr);
          }
        });
      } else if (sLifnr) {
        oModel.read("/ZCE_SUPPLIER_BANK", {
          filters: [new Filter("Lifnr", FilterOperator.EQ, sLifnr)],
          success: function (oData) {
            // If there is only one value in the response
            // if (oData.results.length === 1) {
            //   oView.byId("idBankKey").setSelectedKey(oData.results[0].Bvtyp);
            // }
            // add blank value in the beginning.
            oData.results.unshift({
              bankl: "",
              bvtyp: ""
            });
            this.appmodel.setProperty("/valuehelps/partbank", oData.results);
          }.bind(this),
          error: function (oErr) {
            console.log('partbank error', oErr);
          }
        });
      }
    },

    onBankSelect: function (oEvent) {
      var sBankn = oEvent.getParameter("listItem").getBindingContext("appmodel").getObject("bankn");
      var sIBAN = oEvent.getParameter("listItem").getBindingContext("appmodel").getObject("IBAN");
      var sBankl = oEvent.getParameter("listItem").getBindingContext("appmodel").getObject("bankl");
      var sBanktype = oEvent.getParameter("listItem").getBindingContext("appmodel").getObject("bvtyp");
      this.appmodel.setProperty('/detailDetail/header/Bankn', sBankn);
      this.appmodel.setProperty('/detailDetail/header/IBAN', sIBAN);
      this.appmodel.setProperty('/detailDetail/header/Bankl', sBankl);
      this.oInput.setValue(sBanktype);
      this.getView().byId("idPartnerBankVH").removeSelections(true);
      this.getView().byId("idPartnerBankDialog_VH").close();
    },

    onSearchPartBank: function (oEvent) {
      var oDialog = this.getView().byId("idPartnerBankDialog_VH");
      var sTerm = oEvent.getParameter('query');

      sTerm = this.convertToPattern(sTerm);

      // build filter array
      var aFilter = [];
      if (sTerm) {
        aFilter.push(new Filter("bvtyp", FilterOperator.EQ, sTerm));
      }

      // filter binding
      var oBinding = oDialog.getBinding("items");
      oBinding.filter(aFilter);
    },

    bindNonPOTable: function (oView, oModel, sEbeln) {
      oView.byId("idInvLineItemTable").setVisible(false);

      // var oItemListNonPO = new sap.m.Co
    },

    setPOMode: function (sEbeln) {
      var oView = this.getView();
      var oApProcessModel = this.getOwnerComponent().getModel("ApProcessModel");

      if (sEbeln) {
        this.bindTaxCode(oView, oApProcessModel, sEbeln);
        this.bindBankKey(oView, oApProcessModel, sEbeln);
        // oView.getModel("APModel").refresh(); CAP refactory - useless operation
      }
      this.bindPaymentTerms();
    },

    validatePOModeHeader: function (aErr) {
      sap.ui.core.BusyIndicator.hide();
      var oV = this.getView();
      var msg = "";
      //Tax code
      var po_viewTaxCode = oV.byId("idTaxCode");
      var poTaxCode = po_viewTaxCode.getSelectedKey();
      if (poTaxCode.length <= 0) {
        msg = oBundle.getText("TaxCodeRequired");
        po_viewTaxCode.setShowSecondaryValues(true)
        po_viewTaxCode.setValueState("Error");
        po_viewTaxCode.setValueStateText(msg);
        aErr.push({
          msg: msg
        });
      } else {
        po_viewTaxCode.setValueState("None")
      }
      // PO Number

      var bMultiplePO = this.appmodel.getProperty("/detailDetail/header/bMultiplePO");

      if (!bMultiplePO) {
        var C_PONum = oV.byId("idPurchaseOrder");
        var V_PONum = C_PONum.getValue();

        if (V_PONum.trim().length <= 0) {
          msg = oBundle.getText("PONumberRequired");
          C_PONum.setShowValueStateMessage(true);
          C_PONum.setValueState("Error");
          C_PONum.setValueStateText(msg);
          aErr.push({
            msg: msg
          });
        } else {
          C_PONum.setValueState("None")
        }

        if (V_PONum.trim().length > 10 || V_PONum.trim().length < 10) {
          msg = oBundle.getText("PONumberDifferentFrom_Characters", ["10"]);
          C_PONum.setShowValueStateMessage(true);
          C_PONum.setValueState("Error");
          C_PONum.setValueStateText(msg);
          aErr.push({
            msg: msg
          });
        } else {
          C_PONum.setValueState("None")
        }
      }
      // Doc Date
      var C_DocDt = oV.byId("idDocDate");
      var V_DocDt = C_DocDt.getDateValue();

      if (!V_DocDt) {
        msg = oBundle.getText("IvalidDocumentDate");
        C_DocDt.setValueState("Error");
        C_DocDt.setValueStateText(msg);
        aErr.push({
          msg: msg
        });
      } else {
        C_DocDt.setValueState("None")
      }

      // // Due Date
      // var C_DueDt = oV.byId("idDueDate");
      // var V_DueDt = C_DueDt.getDateValue();

      // if (!V_DueDt) {
      //   msg = "Due Date is invalid";
      //   C_DueDt.setValueState("Error");
      //   C_DueDt.setValueStateText(msg);
      //   aErr.push({
      //     msg: msg
      //   });
      // }

      // Invoice Number
      var C_InvNum = oV.byId("idVendorInvoice");
      var V_InvNum = C_InvNum.getValue();

      if (!V_InvNum || V_InvNum.trim().length <= 0) {
        msg = oBundle.getText("InvoiceNumberRequired");
        C_InvNum.setValueState("Error");
        C_InvNum.setValueStateText(msg);
        aErr.push({
          msg: msg
        });
      } else {
        C_InvNum.setValueState("None");
      }

      // Currency
      var C_Curr = oV.byId("idCurrency");
      var V_Curr = C_Curr.getValue();

      if (V_Curr.trim().length <= 0) {
        msg = oBundle.getText("CurrencyRequired");
        C_Curr.setShowValueStateMessage(true);
        C_Curr.setValueState("Error");
        C_Curr.setValueStateText(msg);
        aErr.push({
          msg: msg
        });
      } else {
        C_Curr.setValueState("None");
      }

      if (V_Curr.trim().length > 3 || V_Curr.trim().length < 3) {
        msg = oBundle.getText("CurrencyDifferentFrom_Characters", ["3"]);
        C_Curr.setShowValueStateMessage(true);
        C_Curr.setValueState("Error");
        C_Curr.setValueStateText(msg);
        aErr.push({
          msg: msg
        });
      } else {
        C_Curr.setValueState("None");
      }

      // Gross Amount
      var C_GrossAmt = oV.byId("idGrossAmt");
      var V_GrossAmt = C_GrossAmt.getValue();

      if (!V_GrossAmt || V_GrossAmt.trim().length <= 0) {
        msgoBundle.getText("GrossAmountRequired");
        C_GrossAmt.setValueState("Error");
        C_GrossAmt.setValueStateText(msg);
        aErr.push({
          msg: msg
        });
      } else {
        C_GrossAmt.setValueState("None");
      }

      // Part Bank
      var C_PartBnk = oV.byId("idGrossAmt");
      var V_PartBnk = C_PartBnk.getSelectedKey();

      // if (!V_PartBnk || V_PartBnk.trim().length <= 0) {
      //   msg = "Partner Bank is required";
      //   C_PartBnk.setValueState("Error");
      //   C_PartBnk.setValueStateText(msg);
      //   aErr.push({
      //     msg: msg
      //   });
      // }

      return aErr;
    },

    validatePOModeLines: function (aErr) {
      var oV = this.getView();
      var isError = false;
      var msg = "";

      var lines = deepExtend([], this.appmodel.getProperty("/DocxLines"));
      var bMultiplePO = this.appmodel.getProperty("/detailDetail/header/bMultiplePO");
      // lines check
      if (!lines || lines.length <= 0) {
        isError = true;
        msg = oBundle.getText("NoLinesForInvoice");
        aErr.push({
          msg: msg
        });
      }
      //tax code columnn check
      for (var i = 0; i < lines.length; i++) {
        if (lines[i].TaxCode == null) {
          isError = true;
          msg = oBundle.getText("PleaseSelectTaxCodeFromLineItems");
          aErr.push({
            msg: msg
          });
        }
        if (bMultiplePO && (lines[i].PONumber == null || lines[i].PONumber == "")) {
          isError = true;
          msg = oBundle.getText("PleaseEnterPurchaseOrderFromLineItems");
          aErr.push({
            msg: msg
          });
        }
      }

      return aErr;
    },

    validateNON_POModeHeader: function (aErr) {
      sap.ui.core.BusyIndicator.hide()
      var oV = this.getView();
      var msg = "";

      // Vendor Number
      var C_VenNum = oV.byId("idVendorNumber");
      var V_VenNum = C_VenNum.getValue();

      if (!V_VenNum || V_VenNum.trim().length <= 0) {
        msg = oBundle.getText("VendorNumberRequired");
        C_VenNum.setValueState("Error");
        C_VenNum.setValueStateText(msg);
        aErr.push({
          msg: msg
        });
      } else {
        C_VenNum.setValueState("None");
      }

      // Company Code Number
      var C_CCNum = oV.byId("idCompanyCode");
      var V_CCNum = C_CCNum.getValue();

      if (!V_CCNum || V_CCNum.trim().length <= 0) {
        msg = oBundle.getText("CompanyCodeRequired");
        C_CCNum.setValueState("Error");
        C_CCNum.setValueStateText(msg);
        aErr.push({
          msg: msg
        });
      } else {
        C_CCNum.setValueState("None");
      }

      // Part Bank
      var C_PartBnk = oV.byId("idBankKey");
      //var V_PartBnkList = C_PartBnk.getItems();
      var V_PartBnk = C_PartBnk.getValue();

      //To check if selected vendor have Partner Bank set up in SAP, if yes, this feild should be kept manadatory

      if (!V_PartBnk || V_PartBnk.trim().length <= 0) {
        msg = oBundle.getText("PartnerBankRequired");
        C_PartBnk.setValueState("Error");
        C_PartBnk.setValueStateText(msg);
        aErr.push({
          msg: msg
        });
      }
      else {
        C_PartBnk.setValueState("None");
      }


      // Doc Date
      var C_DocDt = oV.byId("idDocDate");
      var V_DocDt = C_DocDt.getDateValue();

      if (!V_DocDt) {
        msg = oBundle.getText("InvalidDocumentDate");
        C_DocDt.setValueState("Error");
        C_DocDt.setValueStateText(msg);
        aErr.push({
          msg: msg
        });
      } else {
        C_DocDt.setValueState("None")
      }

      // Invoice Number
      var C_InvNum = oV.byId("idVendorInvoice");
      var V_InvNum = C_InvNum.getValue();

      if (!V_InvNum || V_InvNum.trim().length <= 0) {
        msg = oBundle.getText("InvoiceNumberRequired");
        C_InvNum.setValueState("Error");
        C_InvNum.setValueStateText(msg);
        aErr.push({
          msg: msg
        });
      } else {
        C_InvNum.setValueState("None");
      }

      // Currency
      var C_Curr = oV.byId("idCurrency");
      var V_Curr = C_Curr.getValue();

      if (V_Curr.trim().length <= 0) {
        msg = oBundle.getText("CurrencyRrequired");
        C_Curr.setShowValueStateMessage(true);
        C_Curr.setValueState("Error");
        C_Curr.setValueStateText(msg);
        aErr.push({
          msg: msg
        });
      } else {
        C_Curr.setValueState("None");
      }

      if (V_Curr.trim().length > 3 || V_Curr.trim().length < 3) {
        msg = oBundle.getText("CurrencyDifferentFrom_Characters", ["3"]);
        C_Curr.setShowValueStateMessage(true);
        C_Curr.setValueState("Error");
        C_Curr.setValueStateText(msg);
        aErr.push({
          msg: msg
        });
      } else {
        C_Curr.setValueState("None");
      }

      // Gross Amount
      var C_GrossAmt = oV.byId("idGrossAmt");
      var V_GrossAmt = C_GrossAmt.getValue();

      if (!V_GrossAmt || V_GrossAmt.trim().length <= 0) {
        msg = oBundle.getText("GrossAmountRequired");
        C_GrossAmt.setValueState("Error");
        C_GrossAmt.setValueStateText(msg);
        aErr.push({
          msg: msg
        });
      } else {
        C_GrossAmt.setValueState("None");
      }

      return aErr;
    },

    _errorBuilder: function (aErr) {

      var errors = aErr.map(function (oErr) {
        var oMsg = {
          "message": oErr.msg,
          "type": "E",
          "system": "UI-APP",
          "number": null,
          "log_msg_no": null,
          "msg_id": "Client App Validation"
        }

        return oMsg;
      });

      return errors;

    },

    // CAP da rifattorizzare quando si avrà il tenant su S4
    // asyncFileAttachToSAP
    asyncFileAttachToSAP: function (invoice) {
      var url = "/attach_sap/attach?invoice=" + invoice;
      var body = deepExtend([], this.appmodel.getProperty("/Filelist"));

      this.ajax('POST', url, body)
        .then(function (data) {
          console.log("ATTACH TO SAP TRIGGERED: ", data);
        })
        .catch(function (err) {
          console.log("ATTACH TO SAP ERROR", err);
        });

    },

    // CAP da rifattorizzare quando avremo il tenant di S4
    //Submitted status update on successfull posting
    asyncInvoiceStatusUpdate: function (invoice) {
      var packageId = asyncInvoiceStatusUpdatethis.appmodel.getProperty("/detail/header/PACKAGEID");
      var url = `/api/sap/saveInvoiceStatus?packageId=${packageId}&invoiceDoc=${invoice}&status=POSTED`;
      //var body = deepExtend([], this.appmodel.getProperty("/Filelist"));

      this.ajax('GET', url)
        .then(function (data) {
          console.log("Invoice Document submitted: ", data);
        })
        .catch(function (err) {
          console.log("Invoice Document submitted error: ", err);
        });

    },

    savePayloadBuilderOld: function (mode, oV) {
      var res;
      if (mode === "PO") {
        res = {
          header: {
            // General Info
            Ebeln: oV.byId("idPurchaseOrder").getValue(),
            dBukrs: oV.byId("idCompanyCodeTxt").getText(),
            DocDt: oV.byId("idDocDate").getDateValue(),
            InvNum: oV.byId("idVendorInvoice").getValue(),
            DueDt: oV.byId("idDueDate").getDateValue(),
            Curr: oV.byId("idCurrency").getValue(),
            FreeTxt: oV.byId("idFreeTxt").getValue(),
            InvInd: oV.byId("idInvInd").getSelected(),

            // Amounts
            GrossAmt: oV.byId("idGrossAmt").getValue(),
            DiscAmt: oV.byId("idDiscountAmt").getValue(),
            NetAmt: oV.byId("idNetAmt").getValue(),
            InvDocTyp: oV.byId("idInvDocType").getValue(),
            PaymentTerms: oV.byId("idPaymentTerms").getSelectedKey(),

            // Bank
            PartBank: oV.byId("idBankKey").getSelectedKey(),
            Bankn: oV.byId("bankntxt").getText(),
            Bankl: oV.byId("routingtxt").getText(),
            IBAN: oV.byId("ibantxt").getText(),

            // Tax
            TaxAmt: oV.byId("idHTaxAmt").getValue(),
            TaxCode: oV.byId("idTaxCode").getSelectedKey(),
            CalcTaxInd: oV.byId("idCalcTaxInd").getSelected(),

            // Unplanned Freight
            DelivAmt: oV.byId("idShippingAmount").getValue(),
            TaxExemptAmt: oV.byId("idTaxExemptAmt").getValue(),

          },
          lines: []
        }
      } else if (mode === "NONPO") {
        res = {
          header: {
            // General Info
            DocDt: oV.byId("idDocDate").getDateValue(),
            VendorNumber: oV.byId("idVendorNumber").getValue(),
            Bukrs: oV.byId("idCompanyCode").getValue(),
            SenderName: oV.byId("idSenderName").getValue(),
            ReceiverName: oV.byId("idReceiverName").getValue(),
            InvNum: oV.byId("idVendorInvoice").getValue(),
            DueDt: oV.byId("idDueDate").getDateValue(),
            Curr: oV.byId("idCurrency").getValue(),
            FreeTxt: oV.byId("idFreeTxt").getValue(),
            InvInd: oV.byId("idInvInd").getSelected(),

            // Amounts
            GrossAmt: oV.byId("idGrossAmt").getValue(),
            DiscAmt: oV.byId("idDiscountAmt").getValue(),
            NetAmt: oV.byId("idNetAmt").getValue(),
            InvDocTyp: oV.byId("idInvDocType").getValue(),
            PaymentTerms: oV.byId("idPaymentTerms").getSelectedKey(),

            // Bank
            PartBank: oV.byId("idBankKey").getSelectedKey(),
            Bankn: oV.byId("bankntxt").getText(),
            Bankl: oV.byId("routingtxt").getText(),
            IBAN: oV.byId("ibantxt").getText(),

            // Tax
            TaxAmt: oV.byId("idHTaxAmt").getValue(),
            TaxCode: oV.byId("idTaxCode").getSelectedKey(),
            CalcTaxInd: oV.byId("idCalcTaxInd").getSelected(),

            // Unplanned Freight
            DelivAmt: oV.byId("idShippingAmount").getValue(),
            TaxExemptAmt: oV.byId("idTaxExemptAmt").getValue(),

          },
          lines: []
        }
      }

      return res;
    },

    onChangeTransaction: function (oEvent) {
      var sKey = oEvent.getParameters().selectedItem.getKey();
      this.getView().getModel("detailDetailModel").setProperty("/currentInvoice/Transaction", sKey);
      this.setIsSubsequentDebitCredit(sKey);
    },

    setIsSubsequentDebitCredit: function (sKey) {
      let aPORecords = this.getView().getModel("detailDetailModel").getProperty("/currentInvoice/PORecords");
      let aGLAccountRecords = this.getView().getModel("detailDetailModel").getProperty("/currentInvoice/GLAccountRecords");
      aPORecords = aPORecords.map(oRecord => {
        oRecord.IsSubsequentDebitCredit = this.getValueMappedToIsSubsequentDebitCredit(sKey);
        return oRecord;
      });
      this.getView().getModel("detailDetailModel").setProperty("/currentInvoice/PORecords", aPORecords);

      aGLAccountRecords = aGLAccountRecords.map(oRecord => {
        oRecord.DebitCreditCode = this.getValueMappedToIsSubsequentDebitCredit(sKey);
        return oRecord;
      });
      this.getView().getModel("detailDetailModel").setProperty("/currentInvoice/GLAccountRecords", aGLAccountRecords);
    },

    getValueMappedToIsSubsequentDebitCredit: function (sKey) {
      let oItem = this.getView().byId("idTransaction").getSelectedItem();
      if (!sKey) {
        sKey = oItem? oItem.getKey(): null;
      }

      switch (sKey) {
        case "Invoice":
          return ""
        case "Subsequentdebit":
        case "Creditmemo":
        case "Subsequentcredit":
          return "X"
        default:
          return "X";
      }
    },

    getValueMappedToDocumentCurrency: function () {
      return this.getView().byId("idCurrency").getValue();
    },

    _getControlValue: function (oControl) {
      if (oControl instanceof sap.m.Input || oControl instanceof sap.m.Select || oControl instanceof sap.m.DatePicker) {
        return oControl.getValue();
      } else if (oControl instanceof sap.m.Switch) {
        return oControl.getState();
      } else if (oControl instanceof sap.m.CheckBox) {
        return oControl.getSelected();
      } else {
        throw new Error("Unsupported control type");
      }
    },

    _onChangeEventHandler: function (oEvent, sProperty) {
      var oControl = oEvent.getSource(),
        bControlBelongingToHeader = oControl.getBindingContext("detailDetailModel") === undefined,
        sPath = bControlBelongingToHeader ? "/currentInvoice" + sProperty : oControl.getBindingContext("detailDetailModel").getPath() + sProperty,
        sValue = this._getControlValue(oControl);
      if (sValue === "") {
        sValue = null;
      }
      this.getView().getModel("detailDetailModel").setProperty(sPath, sValue);
    },

    onChangeCompanyCode: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/CompanyCode");
    },

    onChangeDocumentDate: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/DocumentDate");
    },

    onChangeInvoiceReceiptDate: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/InvoiceReceiptDate");
    },

    onChangePostingDate: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/PostingDate");
    },

    onChangeInvoicingParty: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/InvoicingParty");
    },

    onChangeCurrency: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/Currency");
      this.setDocumentCurrency();
    },

    setDocumentCurrency: function () {
      let aPORecords = this.getView().getModel("detailDetailModel").getProperty("/currentInvoice/PORecords");
      let aGLAccountRecords = this.getView().getModel("detailDetailModel").getProperty("/currentInvoice/aGLAccountRecords");
      this.getView().getModel("detailDetailModel").setProperty("/currentInvoice/PORecords", this.setCurrencyInLineDetails(aPORecords));
      this.getView().getModel("detailDetailModel").setProperty("/currentInvoice/GLAccountRecords", this.setCurrencyInLineDetails(aGLAccountRecords));
    },

    setCurrencyInLineDetails: function (aLineDetails) {
      let sCurrency = this.getValueMappedToDocumentCurrency();
      aLineDetails = aLineDetails.map(oRecord => {
        oRecord.DocumentCurrency = sCurrency;
        return oRecord;
      });
      return aLineDetails;
    },

    onChangeSupplierInvoiceIDByInvcgParty: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/SupplierInvoiceIDByInvcgParty");
    },

    onChangeInvoiceGrossAmount: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/InvoiceGrossAmount");
    },

    onChangeSupplierPostingLineItemText: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/SupplierPostingLineItemText");
    },

    onChangeTaxIsCalculatedAutomatically: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/TaxIsCalculatedAutomatically");
    },

    onChangeDueCalculationBaseDate: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/DueCalculationBaseDate");
    },

    onChangeManualCashDiscount: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/ManualCashDiscount");
    },

    onChangePaymentTerms: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/PaymentTerms");
    },

    onChangeCashDiscount1Days: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/CashDiscount1Days");
    },

    onChangeCashDiscount1Percent: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/CashDiscount1Percent");
    },

    onChangeCashDiscount2Days: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/CashDiscount2Days");
    },

    onChangeCashDiscount2Percent: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/CashDiscount2Percent");
    },

    onChangeFixedCashDiscount: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/FixedCashDiscount");
    },

    onChangeNetPaymentDays: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/NetPaymentDays");
    },

    onChangeBPBankAccountInternalID: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/BPBankAccountInternalID");
    },

    onChangePaymentMethod: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/PaymentMethod");
    },

    onChangeReference: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/InvoiceReference");
    },

    onChangeInvoiceReferenceFiscalYear: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/InvoiceReferenceFiscalYear");
    },

    onChangeHouseBank: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/HouseBank");
    },

    onChangeHouseBankAccount: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/HouseBankAccount");
    },

    onChangePaymentBlockingReason: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/PaymentBlockingReason");
    },

    onChangePaymentReason: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/PaymentReason");
    },

    onChangeUnplannedDeliveryCost: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/UnplannedDeliveryCost");
    },

    onChangeFreeTxt: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/DocumentHeaderText");
    },

    onChangeInvDocType: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/AccountingDocumentType");
    },

    onChangeSupplyingCountry: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/SupplyingCountry");
    },

    onChangeAssignment: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/AssignmentReference");
    },

    onChangeIsEUTriangularDeal: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/IsEUTriangularDeal");
    },

    onChangeTaxDeterminationDate: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/TaxDeterminationDate");
    },

    onChangeTaxReportingDate: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/TaxReportingDate");
    },

    onChangeTaxFulfillmentDate: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/TaxFulfillmentDate");
    },

    onChangeWithholdingTaxType: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/WithholdingTaxType");
    },

    onChangeWithholdingTaxCode: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/WithholdingTaxCode");
    },

    onChangeWithholdingTaxBaseAmount: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/WithholdingTaxBaseAmount");
    },

    onChangeTo_SelectedPurchaseOrders_PurchaseOrder: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/PurchaseOrder");
    },

    onChangeTo_SelectedPurchaseOrders_PurchaseOrderItem: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/PurchaseOrderItem");
    },

    onChangeTo_SelectedDeliveryNotes_InboundDeliveryNote: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/InboundDeliveryNote");
    },

    onChangeTo_SelectedServiceEntrySheets_ServiceEntrySheet: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/ServiceEntrySheet");
    },

    onChangeTo_SelectedServiceEntrySheets_ServiceEntrySheetItem: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/ServiceEntrySheetItem");
    },

    onChangePurchaseOrder: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/PurchaseOrder");
    },

    onChangePurchaseOrderItem: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/PurchaseOrderItem");
    },

    onChangePlant: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/Plant");
    },

    onChangeTaxCode: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/TaxCode");
    },

    onChangeSupplierInvoiceItemAmount: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/SupplierInvoiceItemAmount");
    },

    onChangePurchaseOrderQuantityUnit: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/PurchaseOrderQuantityUnit");
    },

    onChangeQuantityInPurchaseOrderUnit: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/QuantityInPurchaseOrderUnit");
    },

    onChangeSupplierInvoiceItemText: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/SupplierInvoiceItemText");
    },

    onChangeIsNotCashDiscountLiable: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/IsNotCashDiscountLiable");
    },

    onChangeServiceEntrySheet: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/ServiceEntrySheet");
    },

    onChangeServiceEntrySheetItem: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/ServiceEntrySheetItem");
    },

    onChangeIsFinallyInvoiced: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/IsFinallyInvoiced");
    },

    onChangeCostCenter: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/CostCenter");
    },

    onChangeBusinessArea: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/BusinessArea");
    },

    onChangeProfitCenter: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/ProfitCenter");
    },

    onChangeFunctionalArea: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/FunctionalArea");
    },

    onChangeWBSElement: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/WBSElement");
    },

    onChangeSalesOrder: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/SalesOrder");
    },

    onChangeSalesOrderItem: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/SalesOrderItem");
    },

    onChangeInternalOrder: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/InternalOrder");
    },

    onChangeCommitmentItem: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/CommitmentItem");
    },

    onChangeFundsCenter: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/FundsCenter");
    },

    onChangeFund: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/Fund");
    },

    onChangeGrantID: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/GrantID");
    },

    onChangeProfitabilitySegment: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/ProfitabilitySegment");
    },

    onChangeBudgetPeriod: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/BudgetPeriod");
    },

    onChangeGLAccount: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/GLAccount");
    },

    onChangeDebitCreditCode: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/DebitCreditCode");
    },

    onChangePartnerBusinessArea: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/PartnerBusinessArea");
    },

    onChangeCostCtrActivityType: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/CostCtrActivityType");
    },

    onChangePersonnelNumber: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/PersonnelNumber");
    },

    onChangeQuantityUnit: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/QuantityUnit");
    },

    onChangeQuantity: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/Quantity");
    },

    onChangeFinancialTransactionType: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/FinancialTransactionType");
    },

    onChangeEarmarkedFundsDocument: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/EarmarkedFundsDocument");
    },

    onChangeEarmarkedFundsDocumentItem: function (oEvent) {
      this._onChangeEventHandler(oEvent, "/EarmarkedFundsDocumentItem");
    },

    onDeletePress: function () {
      var that = this;
      MessageBox.warning(oBundle.getText("DeleteInvoiceAlert"), {
        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
        emphasizedAction: MessageBox.Action.NO,
        onClose: function (sAction) {
          if (sAction === MessageBox.Action.YES) {
            that._confirmDeleteInvoice([that._packageId], true, that);
          }
        }
      });
    },

    onSavePress: function () {
      var that = this;
      MessageBox.warning(oBundle.getText("AlertSave"), {
        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
        emphasizedAction: MessageBox.Action.NO,
        onClose: function (sAction) {
          if (sAction === MessageBox.Action.YES) {
            that._confirmSave();
          }
        }
      });
    },

    // Handler for the "Save" button press
    _confirmSave: function (oEvent) {
      var body = {}; // Initialize request body
      var sUrl = baseManifestUrl + `/odata/save`; // API endpoint for saving data
      var oCurrentInvoice = this.getView().getModel("detailDetailModel").getProperty("/currentInvoice");
      delete oCurrentInvoice.To_SelectedPurchaseOrders;
      delete oCurrentInvoice.To_SelectedDeliveryNotes;
      delete oCurrentInvoice.To_SelectedServiceEntrySheets;
      // Build the request payload
      body = {
        payload: {
          PackageId: this._packageId,  // Package ID
          Invoice: oCurrentInvoice,  // Convert invoice data to JSON string
          RemovedSupplierInvoiceWhldgTaxRecords: this.aRemovedSupplierInvoiceWhldgTaxRecords ? this.aRemovedSupplierInvoiceWhldgTaxRecords : [],
          RemovedPoLineDetails: this.aRemovedPoLineDetails ? this.aRemovedPoLineDetails : [],
          RemovedGlAccountLineDetails: this.aRemovedGlAccountLineDetails ? this.aRemovedGlAccountLineDetails : []
        }
      };
      this.getView().byId('DDPage').setBusy(true);

      const oSuccessFunction = (data) => {
        this.getView().byId('DDPage').setBusy(false);
        console.log(data);  // Log the successful response
        // Show success message to the user
        MessageBox.success(oBundle.getText("SuccessfullySavedRecord"), {
          title: "Success",
          details: data,  // Provide details of the response
          styleClass: sResponsivePaddingClasses
        });

        // Call the cancel handler to release the lock
        return this._confirmCancelEdit().then(result => this._getData());
      };

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        this.getView().byId('DDPage').setBusy(false);
        console.log(JSON.parse(XMLHttpRequest.responseText).error.message);  // Log the error
        let that = this;
        // Show error message to the user
        MessageBox.error(oBundle.getText("UnexpectedErrorOccurred"), {
          title: "Error",
          details: JSON.parse(XMLHttpRequest.responseText).error.message,  // Provide error details
          styleClass: sResponsivePaddingClasses,
          onClose: function () {
            // Call _getData() after error is handled
            that._getData();
          }
        });

        // Call the cancel handler to release the lock even in case of failure
        this._confirmCancelEdit();
      };

      // Execute AJAX request
      this.executeRequest(sUrl, 'POST', JSON.stringify(body), oSuccessFunction, oErrorFunction);
    },

    _getMimeType: function (sExtension) {
      const aMimeTypes = this.getOwnerComponent().getModel("mimeTypes").getProperty("/");
      return aMimeTypes[sExtension];
    },

    _getExtensionType: function (sMimeType) {
      const aExtensions = this.getOwnerComponent().getModel("extensions").getProperty("/");
      return aExtensions[sMimeType];
    },

    // Download handler
    onDownloadAttachment: function (oEvent) {
      var oItem = oEvent.getSource(); // Assuming the attachment is triggered by clicking on a UI element (e.g. button)
      var sPath = oItem.getBindingContext("detailDetailModel").getPath(); // Get path from appmodel
      var oAttachmentData = this.getView().getModel("detailDetailModel").getProperty(sPath); // Get the full attachment object

      // Extract the base64 string and file information from the model
      var sBase64 = oAttachmentData.attachment;
      var sFileName = oAttachmentData.nomeAttachment; // e.g., FilePdf_202400163632.pdf
      var sMimeType = this._getMimeType(oAttachmentData.formatoAttachment); // Get mime type based on file extension

      // Create a Blob from the base64 string
      var byteCharacters = atob(sBase64); // Decode the base64 string
      var byteNumbers = new Array(byteCharacters.length);
      for (var i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      var byteArray = new Uint8Array(byteNumbers);
      var oBlob = new Blob([byteArray], { type: sMimeType });

      // Create a link element to initiate the download
      var oLink = document.createElement("a");
      oLink.href = URL.createObjectURL(oBlob);
      oLink.download = sFileName;

      // Append the link to the body, trigger a click, and remove it afterward
      document.body.appendChild(oLink);
      oLink.click();
      document.body.removeChild(oLink);
    },

    _getDocumentServiceBaseURL: function () {
      var componentName = this.getOwnerComponent().getManifestEntry("/sap.app/id").replaceAll(".", "/");
      var componentPath = jQuery.sap.getModulePath(componentName);
      return componentPath + "/docservice/";
    },

    onSubmitPress: function () {
      var that = this;
      MessageBox.warning(oBundle.getText("AlertSubmit"), {
        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
        emphasizedAction: MessageBox.Action.NO,
        onClose: function (sAction) {
          if (sAction === MessageBox.Action.YES) {
            that._confirmSubmit();
          }
        }
      });
    },

    _confirmSubmit: function (oEvent) {
      var body = {}; // Initialize request body
      var sUrl = baseManifestUrl + `/odata/submit`;// API endpoint for saving data

      // Retrieve the current invoice data from the model
      var oCurrentInvoice = this.getView().getModel("detailDetailModel").getProperty("/currentInvoice");
      // Build the request payload
      body = {
        payload: {
          PackageId: this._packageId,  // Package ID
          Invoice: oCurrentInvoice,  // Convert invoice data to JSON string
          RemovedSupplierInvoiceWhldgTaxRecords: this.aRemovedSupplierInvoiceWhldgTaxRecords ? this.aRemovedSupplierInvoiceWhldgTaxRecords : [],
          RemovedPoLineDetails: this.aRemovedPoLineDetails ? this.aRemovedPoLineDetails : [],
          RemovedGlAccountLineDetails: this.aRemovedGlAccountLineDetails ? this.aRemovedGlAccountLineDetails : []
        }
      };
      this.getView().byId('DDPage').setBusy(true);

      const oSuccessFunction = (data) => {
        this.getView().byId('DDPage').setBusy(false);
        console.log(data);  // Log the successful response
        // Show success message to the user
        MessageBox.success(oBundle.getText("SuccessfullySubmittedRecord"), {
          title: "Success",
          details: data,  // Provide details of the response
          styleClass: sResponsivePaddingClasses
        });

        // Call the cancel handler to release the lock
        return this._confirmCancelEdit().then(result => this._getData());
      };

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        this.getView().byId('DDPage').setBusy(false);
        console.log(errorThrown);  // Log the error
        let that = this;
        // Show error message to the user
        MessageBox.error(oBundle.getText("MessagePopoverError"), {
          title: "Error",
          details: JSON.parse(XMLHttpRequest.responseText).error.message,  // Provide error details
          styleClass: sResponsivePaddingClasses,
          onClose: function () {
            // Call _getData() after error is handled
            that._getData();
          }
        });

        // Call the cancel handler to release the lock even in case of failure
        this._confirmCancelEdit();

        // Call _getData() after error is handled
        this._getData();
      };

      // Execute AJAX request
      this.executeRequest(sUrl, 'POST', JSON.stringify(body), oSuccessFunction, oErrorFunction);

    },
    onAssignPressHandler: function (oEvent) {
      this.onAssignPress(this.getView(), this);
    }
  });
});
