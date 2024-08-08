/***************************************************************************
This approach was derived from
  https://github.com/OfficeDev/Office-OOXML-EmbedAddin/tree/master

See also...
  https://learn.microsoft.com/en-us/office/dev/add-ins/develop/automatically-open-a-task-pane-with-a-document#use-open-xml-to-tag-the-document

Published at https://github.com/opendocx/opendocx
Developer: Lowell Stewart
Email: lowell@opendocx.com

***************************************************************************/

using System;
using System.Threading.Tasks;
using System.IO;
using System.Collections.Generic;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using We = DocumentFormat.OpenXml.Office2013.WebExtension;
using Wetp = DocumentFormat.OpenXml.Office2013.WebExtentionPane;
using System.Linq;
using System.IO.Packaging;
using DocumentFormat.OpenXml.Office2013.WebExtentionPane;
using System.Xml;

namespace OpenDocx;

public class TaskPaneEmbedder
{
    public byte[] EmbedTaskPane(byte[] docxBytes, string guid, string addInId, string version, string store,
        string storeType, string dockState, bool visibility, double width, uint row)
    {
        using (MemoryStream memoryStream = new MemoryStream())
        {
            memoryStream.Write(docxBytes, 0, docxBytes.Length);
            using (var document = WordprocessingDocument.Open(memoryStream, true))
            {
                // add task panes part if it doesn't exist
                var taskPanesPart = document.WebExTaskpanesPart;
                if (taskPanesPart == null)
                {
                    taskPanesPart = document.AddWebExTaskpanesPart();
                }

                // find web extension child part by guid, or create if it doesn't exist yet
                var webExtensionPart = taskPanesPart.GetPartsOfType<WebExtensionPart>()
                    .Where(p => p.WebExtension.Id == guid)
                    .FirstOrDefault();
                if (webExtensionPart != null)
                {
                    // update logic?
                    var webExtension = webExtensionPart.WebExtension;
                    // update store reference? update alternate references? update Office.AutoShowTaskpaneWithDocument?
                }
                else // webExtensionPart == null, so add it
                {
                    webExtensionPart = taskPanesPart.AddNewPart<WebExtensionPart>(); // "rId1");

                    // Generate webExtensionPart Content
                    var webExtension = new We.WebExtension() { Id = guid }; // "{635BF0CD-42CC-4174-B8D2-6D375C9A759E}" };
                    webExtension.AddNamespaceDeclaration("we", "http://schemas.microsoft.com/office/webextensions/webextension/2010/11");

                    webExtension.Append(new We.WebExtensionStoreReference()
                    {
                        Id = addInId,
                        Version = version,
                        Store = store,
                        StoreType = storeType
                    });

                    webExtension.Append(new We.WebExtensionReferenceList());

                    // Add the property that makes the taskpane visible.
                    var webExtensionPropertyBag = new We.WebExtensionPropertyBag();
                    var webExtensionProperty = new We.WebExtensionProperty()
                    {
                        Name = "Office.AutoShowTaskpaneWithDocument",
                        Value = "true"
                    };
                    webExtensionPropertyBag.Append(webExtensionProperty);
                    webExtension.Append(webExtensionPropertyBag);

                    webExtension.Append(new We.WebExtensionBindingList());

                    var snapshot = new We.Snapshot();
                    snapshot.AddNamespaceDeclaration("r", "http://schemas.openxmlformats.org/officeDocument/2006/relationships");
                    webExtension.Append(snapshot);

                    webExtensionPart.WebExtension = webExtension;
                }
                var relationshipId = taskPanesPart.GetIdOfPart(webExtensionPart);

                // get (or create) list of task panes from task pane part
                var taskpanes = taskPanesPart.Taskpanes;
                if (taskpanes == null)
                {
                    // Generate taskPanesPart Content
                    taskpanes = new Wetp.Taskpanes();
                    taskpanes.AddNamespaceDeclaration("wetp", "http://schemas.microsoft.com/office/webextensions/taskpanes/2010/11");
                }

                // find existing task pane ref, or create if it doesn't exist yet
                // searching for webExtensionTaskpane within existing children of taskpanes
                var webExtensionPartReference = taskpanes
                    .Descendants<Wetp.WebExtensionPartReference>()
                    .Where(r => r.Id == relationshipId)
                    .FirstOrDefault();
                if (webExtensionPartReference != null)
                {
                    // update the webExtensionPartReference
                    var webExtensionTaskpane = (WebExtensionTaskpane) webExtensionPartReference.Parent;
                    webExtensionTaskpane.DockState = dockState;
                    webExtensionTaskpane.Visibility = visibility;
                    webExtensionTaskpane.Width = width;
                    webExtensionTaskpane.Row = row;
                }
                else // webExtensionPartReference == null; create the task pane and part reference
                {
                    var webExtensionTaskpane = new Wetp.WebExtensionTaskpane()
                    {
                        DockState = dockState,
                        Visibility = visibility,
                        Width = width,
                        Row = row
                    };
                    webExtensionPartReference = new Wetp.WebExtensionPartReference() { Id = relationshipId };
                    webExtensionPartReference.AddNamespaceDeclaration("r", "http://schemas.openxmlformats.org/officeDocument/2006/relationships");

                    webExtensionTaskpane.Append(webExtensionPartReference);
                    taskpanes.Append(webExtensionTaskpane);
                }
                if (taskPanesPart.Taskpanes == null)
                {
                    taskPanesPart.Taskpanes = taskpanes;
                }
                // no explicit save -- disposing automatically saves changes to byte stream
            }
            return memoryStream.ToArray(); // and this returns the now-modified byte stream
        }
    }

    public byte[] RemoveTaskPane(byte[] docxBytes, string guid)
    {
        using (MemoryStream memoryStream = new MemoryStream())
        {
            memoryStream.Write(docxBytes, 0, docxBytes.Length);
            using (var document = WordprocessingDocument.Open(memoryStream, true))
            {
                var taskPanesPart = document.WebExTaskpanesPart;
                if (taskPanesPart != null)
                {
                    var webExtensionPart = taskPanesPart.GetPartsOfType<WebExtensionPart>()
                            .Where(p => p.WebExtension.Id == guid)
                            .FirstOrDefault();
                    if (webExtensionPart != null)
                    {
                        var relationshipId = taskPanesPart.GetIdOfPart(webExtensionPart);
                        // find existing task pane ref -- searching for webExtensionTaskpane within existing children of taskpanes
                        var webExtensionPartReference = taskPanesPart.Taskpanes
                            .Descendants<Wetp.WebExtensionPartReference>()
                            .Where(r => r.Id == relationshipId)
                            .FirstOrDefault();
                        if (webExtensionPartReference != null)
                        {
                            var parent = webExtensionPartReference.Parent;
                            parent.RemoveAllChildren();
                            parent.Remove();
                            // taskPanesPart.Taskpanes.RemoveChild(parent);
                        }
                        taskPanesPart.DeletePart(webExtensionPart);
                    }
                    if (!taskPanesPart.Taskpanes.HasChildren)
                    {
                        document.DeletePart(taskPanesPart);
                    }
                }
                // no explicit save -- disposing automatically saves changes to byte stream
            }
            return memoryStream.ToArray();
        }
    }

    public TaskPaneMetadata[] GetTaskPaneInfo(byte[] docxBytes) {
        var result = new List<TaskPaneMetadata>();
        using (MemoryStream memoryStream = new MemoryStream(docxBytes))
        {
            using (var document = WordprocessingDocument.Open(memoryStream, false))
            {
                var taskPanesPart = document.WebExTaskpanesPart;
                if (taskPanesPart != null)
                {
                    foreach (var webExtensionPart in taskPanesPart.GetPartsOfType<WebExtensionPart>()) {
                        var resultItem = new TaskPaneMetadata();
                        var webExtension = webExtensionPart.WebExtension;
                        resultItem.Guid = webExtension.Id;

                        var storeReference = webExtension.WebExtensionStoreReference;
                        resultItem.AddInId = storeReference.Id;
                        resultItem.Version = storeReference.Version;
                        resultItem.Store = storeReference.Store;
                        resultItem.StoreType = storeReference.StoreType;

                        var webExtensionPropertyBag = webExtension.WebExtensionPropertyBag;
                        var autoShowProperty = webExtensionPropertyBag
                            .Descendants<We.WebExtensionProperty>()
                            .Where(p => p.Name == "Office.AutoShowTaskpaneWithDocument")
                            .FirstOrDefault();
                        if (autoShowProperty != null) {
                            resultItem.AutoShow = XmlConvert.ToBoolean(autoShowProperty.Value);
                        }
                        // look up task pane for this web extension
                        var relationshipId = taskPanesPart.GetIdOfPart(webExtensionPart);
                        // find existing task pane ref
                        // searching for webExtensionTaskpane within existing children of taskpanes
                        var webExtensionPartReference = taskPanesPart.Taskpanes
                            .Descendants<Wetp.WebExtensionPartReference>()
                            .Where(r => r.Id == relationshipId)
                            .FirstOrDefault();
                        if (webExtensionPartReference != null)
                        {
                            var webExtensionTaskpane = (WebExtensionTaskpane) webExtensionPartReference.Parent;
                            resultItem.DockState = webExtensionTaskpane.DockState;
                            resultItem.Visibility = webExtensionTaskpane.Visibility;
                            resultItem.Width = webExtensionTaskpane.Width;
                            resultItem.Row = webExtensionTaskpane.Row;
                        }
                        result.Add(resultItem);
                    }
                }
            }
        }
        return result.ToArray();
    }

    // when calling from Node.js via Edge, we only get to pass one parameter
    public async Task<object> EmbedTaskPaneAsync(dynamic input)
    {
        var inputDict = (IDictionary<string, object>)input;
        var docxBytes = (byte[])input.docxBytes;
        var guid = (string)input.guid;
        var addInId = (string)input.addInId;
        var version = (string)input.version;
        var store = inputDict.ContainsKey("store") ? (string)inputDict["store"] : "en-US";
        var storeType = inputDict.ContainsKey("storeType") ? (string)inputDict["storeType"] : "OMEX";
        var dockState = inputDict.ContainsKey("dockState") ? (string)inputDict["dockState"] : "right";
        var visibility = inputDict.ContainsKey("visibility") ? (bool)inputDict["visibility"] : true;
        var width = inputDict.ContainsKey("width") ? Convert.ToDouble(inputDict["width"]) : 350.0;
        var row = inputDict.ContainsKey("row") ? Convert.ToUInt32(inputDict["row"]) : 1U;
        return EmbedTaskPane(docxBytes, guid, addInId, version, store, storeType, dockState, visibility, width, row);
    }

    public async Task<object> RemoveTaskPaneAsync(dynamic input)
    {
        var docxBytes = (byte[])input.docxBytes;
        var guid = (string)input.guid;
        return RemoveTaskPane(docxBytes, guid);
    }

    public async Task<object> GetTaskPaneInfoAsync(dynamic input)
    {
        var docxBytes = (byte[])input.docxBytes;
        return GetTaskPaneInfo(docxBytes);
    }
}
