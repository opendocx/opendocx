using System.Xml.Linq;

namespace OpenDocx;

internal class OD
{
  // "Manipulable" XML elements that represent parsed OpenDocx fields
  // (raw, but easily manipulable, XML elements -- Word does not understand these or know what they are!)
  public static readonly XName Content = "Content";
  public static readonly XName List = "List";
  public static readonly XName EndList = "EndList";
  public static readonly XName If = "If";
  public static readonly XName ElseIf = "ElseIf";
  public static readonly XName Else = "Else";
  public static readonly XName EndIf = "EndIf";
  public static readonly XName ListPr = "ListPr";

  public static readonly XName Expr = "expr";
  public static readonly XName Depth = "depth";
  public static readonly XName Id = "id";
  public static readonly XName Punc = "punc";
}

// this class must match (exactly) what's defined in OpenXmlPowerTools
internal class PA
{
  // "Source" XML elements defined by OpenXmlPowerTools' DocumentAssembler
  // (the XML elements that visually appear inside content controls in Word, describing OXPT assembly behavior)
  public static readonly XName Content = "Content";
  public static readonly XName Table = "Table";
  public static readonly XName Repeat = "Repeat";
  public static readonly XName EndRepeat = "EndRepeat";
  public static readonly XName Conditional = "Conditional";
  public static readonly XName EndConditional = "EndConditional";
  // XML attributes that work with the above
  public static readonly XName Select = "Select";
  public static readonly XName Optional = "Optional";
  public static readonly XName Match = "Match";
  public static readonly XName NotMatch = "NotMatch";
  public static readonly XName Depth = "Depth";
}
