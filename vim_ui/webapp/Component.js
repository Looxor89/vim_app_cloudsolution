sap.ui.define([
    "sap/base/util/UriParameters",
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device",
    "vim_ui/model/models",
    "sap/f/library",
    "sap/f/FlexibleColumnLayoutSemanticHelper"
], function (UriParameters, UIComponent, JSONModel, Device, models, library, FlexibleColumnLayoutSemanticHelper) {
    "use strict";

    var LayoutType = library.LayoutType;

    return UIComponent.extend("vim_ui.Component", {

        metadata: {
            manifest: "json"
        },

        /**
         * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
         * @public
         * @override
         */
        init: function () {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            var oModel = new JSONModel();
            this.setModel(oModel);
            
            sap.ui.getCore().getConfiguration().setLanguage("it-IT");

            // set appmodel demo model on this sample
            var oAppdata = new JSONModel(jQuery.sap.getModulePath("vim_ui", "/json/appdata.json"));
            oAppdata.setSizeLimit(1000);
            this.setModel(oAppdata, "appmodel");

            var oPersistdata = new JSONModel(jQuery.sap.getModulePath("vim_ui", "/json/persist.json"));
            oPersistdata.setSizeLimit(1000);
            this.setModel(oPersistdata, "prmodel");

            // var aMimeTypes = new JSONModel(jQuery.sap.getModulePath("vim_ui", "/json/mimeTypes.json"));
            // this.setModel(aMimeTypes, "mimeTypes");


            var oMsgModel = new JSONModel({
                "aMsg": []
            });
            oMsgModel.setSizeLimit(1000);
            this.setModel(oMsgModel, "msg");

            // GetProps
            this.getProps()

            // enable routing
            this.getRouter().initialize();

            // set the device model
            this.setModel(models.createDeviceModel(), "device");
        },

        getProps: function () {
            var url = jQuery.sap.getModulePath(this.getMetadata().getManifest()["sap.app"].id) + "/odata/capabilities()"

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
                success: function (props) {
                    console.log(props);
                    // set props model
                    var oPropsModel = new JSONModel(props.value[0].result );
                    this.setModel(oPropsModel, "props");

                }.bind(this),
                error: function (error) {
                    console.log('error loading props', error)
                }.bind(this)
            });
        },

        getHelper: function () {
            var oFCL = this.getRootControl().byId("fcl");
            var oParams = UriParameters.fromQuery(location.search);
            var oSettings = {
                defaultTwoColumnLayoutType: LayoutType.TwoColumnsMidExpanded,
                mode: oParams.get("mode"),
                // defaultThreeColumnLayoutType: LayoutType.ThreeColumnsMidExpanded,
                maxColumnsCount: oParams.get("max")
            };

            return FlexibleColumnLayoutSemanticHelper.getInstanceFor(oFCL, oSettings);
        }
    });
});
