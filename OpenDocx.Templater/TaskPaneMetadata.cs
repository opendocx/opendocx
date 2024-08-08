namespace OpenDocx
{
    public class TaskPaneMetadata
    {
        public string Guid { get; set; }
        public string AddInId { get; set; }
        public string Version { get; set; }
        public string Store { get; set; }
        public string StoreType { get; set; }
        public bool AutoShow { get; set; }
        public string DockState { get; set; }
        public bool Visibility { get; set; }
        public double Width { get; set; }
        public uint Row { get; set; }
    }
}
