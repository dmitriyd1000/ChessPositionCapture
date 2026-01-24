using backend.Interfaces;

namespace backend;

public class AppSettings
{
    public const string SectionName = "AppSettings";
    
    public IOverlayBounds OverlayBounds { get; set; }
    
    // Snapshot settings
    public bool RbutWhiteTurn { get; set; }
    public bool ChkbxCanBlackCastleKingSide { get; set; }
    public bool ChkbxCanBlackCastleQueenSide { get; set; }
    public bool ChkbxCanWhiteCastleKingSide { get; set; }
    public bool ChkbxCanWhiteCastleQueenSide { get; set; }
    public decimal NumbxTolleranceRecogn { get; set; }
}