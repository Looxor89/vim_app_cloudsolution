sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "vim_ui/utils/formatter"
], function (BaseController, JSONModel, MessageBox, formatter) {
  "use strict";
  var sResponsivePaddingClasses = "sapUiResponsivePadding--header sapUiResponsivePadding--content sapUiResponsivePadding--footer";
  //manifest base URL
  var baseManifestUrl;
  var oBundle;
  var indexOfCurrentAttachment;

  return BaseController.extend("vim_ui.controller.Detail", {
    formatter: formatter,

    onInit: function () {
      // read msg from i18n model
      oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
      //set manifest base URL
      baseManifestUrl = jQuery.sap.getModulePath(this.getOwnerComponent().getMetadata().getManifest()["sap.app"].id);
      indexOfCurrentAttachment = 0;
      this.oRouter = this.getOwnerComponent().getRouter();
      this.oRouter.getRoute("detailDetail").attachPatternMatched(this._onRouteMatched, this);
      var bus = this.getOwnerComponent().getEventBus();
      // bus.subscribe("reload", this._fullReload, this);

    },

    _onRouteMatched: function (oEvent) {
      this._packageId = oEvent.getParameter("arguments").packageId || this._packageId || "0";
      this.getView().setModel(new JSONModel({}), "detailModel");
      this.setDetailController(this);
      this.fetchAttachments(this._packageId);
      
      //   .then(this.getDoxData.bind(this))
      //   .then(function (data) {
      //     // do something after dox data loads
      //     // this.renderGuideBox(data);

      //   }.bind(this))
      //   .catch(function (error) {
      //     console.log(error);
      //   }.bind(this));

      // this.fetchData(this._packageId)
      //   .then(this.getDoxData.bind(this))
      //   .catch(function (error) {
      //     console.log(error);
      //   }.bind(this));
    },

    fetchAttachments : function (packageId) {
      var oDetailModel = this.getView().getModel("detailModel");
      var aURL = baseManifestUrl + "/odata/getAttachment()?PackageId=" + packageId + "&Extension=PDF";

      const oSuccessFunction = (data) => {
        let InvoiceAttachments = [];
        const result = data.value[0].result;
        if (result) {
          result.forEach(element => {
            let source = null,
              title = null;
              
            let base64EncodedPDF = element.attachment,
            decodedPdfContent = atob(base64EncodedPDF),
            byteArray = new Uint8Array(decodedPdfContent.length);
            for(var i=0; i<decodedPdfContent.length; i++){
              byteArray[i] = decodedPdfContent.charCodeAt(i);
            }
            let blob = new Blob([byteArray.buffer], { type: 'application/pdf' });
            source = URL.createObjectURL(blob);
            title = element.nomeAttachment;
            jQuery.sap.addUrlWhitelist("blob");

            InvoiceAttachments.push({
              id: element.ID,
              body_Id: element.body_Id,
              source: source,
              title: title
            });
          });
        }
        
        oDetailModel.setProperty("/InvoiceAttachments", InvoiceAttachments);
        this.setCurrentAttachment(indexOfCurrentAttachment);
        return data;
      };

      const oErrorFunction = (XMLHttpRequest, textStatus, errorThrown) => {
        console.log(errorThrown);
        // Show error message to the user
        MessageBox.error(oBundle.getText("AlertErrorToLoadAttachment"), {
          title: "Error",
          details: errorThrown,  // Provide error details
          styleClass: sResponsivePaddingClasses
        });
      };

      this.executeRequest(aURL, 'GET', null, oSuccessFunction, oErrorFunction);
      
    },

    setCurrentAttachment: function (attachmentNumber) {
      var oDetailModel = this.getView().getModel("detailModel"),
      aInvoiceAttachments = oDetailModel.getProperty("/InvoiceAttachments");
      if (!aInvoiceAttachments) {
        oDetailModel.setProperty("/CurrentAttachment", []);
      } else {
        oDetailModel.setProperty("/CurrentAttachment", aInvoiceAttachments.at(attachmentNumber));
      }
    },

    onPreviousAttachment: function () {
      indexOfCurrentAttachment = indexOfCurrentAttachment - 1;
      this.setCurrentAttachment(indexOfCurrentAttachment);
    },

    onNextAttachment: function () {
      indexOfCurrentAttachment = indexOfCurrentAttachment + 1;
      this.setCurrentAttachment(indexOfCurrentAttachment);
    },

    _fullReload: function (oEvent) {
      console.log('from event bus detail');
      // this._packageId = oEvent.getParameter("arguments").packageId || this._packageId || "0";
      this.fetchData(this._packageId)
        .then(this.getDoxData.bind(this))
        .then(function (data) {
          // do something after dox data loads
          // this.renderGuideBox(data);

        }.bind(this))
        .catch(function (error) {
          console.log(error);
        }.bind(this));
    },

    fetchData: function (packageId) {
      if (!packageId) {
        console.log("packageId not passed");
        return null;
      }
      var aURL = baseManifestUrl + "/odata/extended()?PACKAGEID=" + packageId + "";

      return new Promise(function (resolve, reject) {

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
          success: function (data) {
            resolve(data.value[0].result.pop());
          },
          error: function (error) {
            reject(error);
          }
        });

      });
    },

    getDoxData: function (oData) {
      var oURL = {
        dimensions: "/api/dox/document/jobs/" + oData.JobId + "/pages/dimensions?clientId=" + oData.ClientId + "",
        job: "/api/dox/document/jobs/" + oData.JobId + "?clientId=" + oData.ClientId + "",
      };

      var appModel = this.getOwnerComponent().getModel("appmodel");

      appModel.setProperty("/detail/header", oData);

      function preloadImages(mObj) {

        var arrayOfImages = [];
        for (let idx = 1; idx <= mObj.pages; idx++) {
          arrayOfImages.push("/api/dox/document/jobs/" + mObj.jobId + "/pages/" + idx + "?clientid=" + mObj.clientId);

        }

        $(arrayOfImages).each(function () {
          // $('<img/>')[0].src = this;
          // Alternatively you could use:
          (new Image()).src = this;
        });
      }

      return new Promise(function (resolve, reject) {

        $.ajax({
          url: oURL.dimensions,
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "cache": false,
          },
          dataType: "json",
          async: true,
          success: function (data) {
            console.log("dimensions ", data);
            var pages = parseInt(Object.keys(data.results).pop());
            console.log("pages ", pages);
            appModel.setProperty("/dimensions", data.results);
            appModel.setProperty("/pages", pages);

            preloadImages({
              jobId: oData.JobId,
              clientId: oData.ClientId,
              pages: pages
            });

            var imgurl = "/api/dox/document/jobs/" + oData.JobId + "/pages/" + Object.keys(data.results)[0] + "?clientid=" + oData.ClientId;
            appModel.setProperty("/imgurl", imgurl);

          }.bind(this),
          error: function (error) {
            console.log(error);

          }.bind(this)

        });

        $.ajax({
          url: oURL.job,
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "cache": false,
          },
          dataType: "json",
          async: true,
          success: function (data) {
            console.log("OCRViewerDox ", data);
            appModel.setProperty("/job", data);
            resolve(data);

          }.bind(this),
          error: function (error) {
            console.log(error);
            reject(error)
          }.bind(this)
        });

      });
    },

    // TODO: remove unused
    onExtraction: function (oEvent) {
      var oNextUIState = this.getOwnerComponent().getHelper().getNextUIState(1);
      this.oRouter.navTo("detailDetail", { layout: oNextUIState.layout });
    },
    // TODO: remove unused
    handleFullScreen: function () {
      this.bFocusFullScreenButton = true;
      var sNextLayout = this.oModel.getProperty("/actionButtonsInfo/midColumn/fullScreen");
      this.oRouter.navTo("detail", { layout: sNextLayout, product: this._product });
    },
    // TODO: remove unused
    handleExitFullScreen: function () {
      this.bFocusFullScreenButton = true;
      var sNextLayout = this.oModel.getProperty("/actionButtonsInfo/midColumn/exitFullScreen");
      this.oRouter.navTo("detail", { layout: sNextLayout, product: this._product });
    },

    handleClose: function () {
      var sNextLayout = this.oModel.getProperty("/actionButtonsInfo/midColumn/closeColumn");
      this.oRouter.navTo("master", { layout: sNextLayout });
    },

    // Pagination
    _handlePageChange: function (oEvent) {
      // debugger;
      var page = oEvent.getParameter("page");
      if (page) {
        var appModel = this.getOwnerComponent().getModel("appmodel");
        var jobId = appModel.getProperty("/detail/header/JOBID");
        var clientId = appModel.getProperty("/detail/header/CLIENTID");

        var imgurl = "/api/dox/document/jobs/" + jobId + "/pages/" + page + "?clientid=" + clientId;
        appModel.setProperty("/imgurl", imgurl);
        return;
      }
      console.log('reached end of page-bounds');
    }
    
  });
});
