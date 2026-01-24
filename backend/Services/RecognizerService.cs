using System.ComponentModel;
using System.Diagnostics;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using ChessDotNet;
using ChessDotNet.Pieces;
using ChessDotNet.Source;
using DarknetYolo;
using Microsoft.Extensions.Options;
using GameCreationData = ChessDotNet.GameCreationData;

namespace backend.Services
{
    public class RecognizerService
    {
        #region Fields

        private const int SideLength = 8;
        private readonly IOptionsMonitor<AppSettings> _appSettings;
        public static ChessGame _newChessBoard = null;
        public static DarknetYOLO model;

        #endregion

        #region Constructor

        public RecognizerService(IOptionsMonitor<AppSettings> appSettings)
        {
            _appSettings = appSettings;
        }

        #endregion

        #region Properties

        public static bool BoardFound { get; private set; }
        public static int ScreenIndex { get; private set; } = -1;
        public static int MinimumSize { get; set; } = 32;
        public static Point BoardLocation { get; private set; }
        public static Size BoardSize { get; private set; }
        public static SizeF FieldSize { get; set; }

        private class CellBoard
        {
            public Bitmap _bitmapColor;
            public Bitmap _bitmapGray;
            public double _averageGray;
            public double _varianceGray;
            public string _recognPiece;
            public string _squareColor;
            public string _pieceColor;

            public void Calculate()
            {
                MakeGrayscaleBitmap();
                    // _bitmapGray.Save(@"C:\Users\dmytro.dmytriiev\source\repos\BerldChess\Source\BerldChess\cell_gray.bmp");
                CalcAverageGrayImg();
                CalcVarianceGrayColor();
            }

            private void CalcAverageGrayImg()
            {
                Rectangle rect = new Rectangle(0, 0, _bitmapGray.Width, _bitmapGray.Height);
                BitmapData imageData = _bitmapGray.LockBits(rect, ImageLockMode.ReadWrite, _bitmapGray.PixelFormat);
                IntPtr ptr = imageData.Scan0;
                int bytes = Math.Abs(imageData.Stride) * _bitmapGray.Height;
                byte[] grayValues = new byte[bytes];
                System.Runtime.InteropServices.Marshal.Copy(ptr, grayValues, 0, bytes);
                var sum = 0;
                int w = 1;
                foreach (int x in grayValues)
                {
                    if (w <= _bitmapGray.Width)
                        sum += x;
                    if (w >= imageData.Stride)
                        w = 1;
                    else
                        w++;
                }
                _bitmapGray.UnlockBits(imageData);
                _averageGray = sum / grayValues.Length;
            }

            private void CalcVarianceGrayColor()
            {
                Rectangle rect = new Rectangle(0, 0, _bitmapGray.Width, _bitmapGray.Height);
                BitmapData imageData = _bitmapGray.LockBits(rect, ImageLockMode.ReadWrite, _bitmapGray.PixelFormat);
                IntPtr ptr = imageData.Scan0;
                int bytes = Math.Abs(imageData.Stride) * _bitmapGray.Height;
                byte[] grayValues = new byte[bytes];
                Marshal.Copy(ptr, grayValues, 0, bytes);
                double variance = 0f;
                int w = 1;
                foreach (int x in grayValues)
                {
                    if (w <= _bitmapGray.Width)
                        variance += ((x - _averageGray)/255)*((x - _averageGray)/255);
                    if (w >= imageData.Stride)
                        w = 1;
                    else
                        w++;
                }
                _bitmapGray.UnlockBits(imageData);
                _varianceGray = variance / grayValues.Length;
            }
            
            private void MakeGrayscaleBitmap()
            {
                //Lock bitmap's bits to system memory
                Rectangle rect = new Rectangle(0, 0, _bitmapColor.Width, _bitmapColor.Height);
                BitmapData bmpColorData = _bitmapColor.LockBits(rect, ImageLockMode.ReadWrite, _bitmapColor.PixelFormat);
                _bitmapGray = new Bitmap(_bitmapColor.Width, _bitmapColor.Height, PixelFormat.Format8bppIndexed);
                
                var resultPalette = _bitmapGray.Palette;
                for (int i = 0; i < 256; i++)
                {  resultPalette.Entries[i] = Color.FromArgb(255, i, i, i);  }
                _bitmapGray.Palette = resultPalette;
                
                BitmapData bmpGrayData = _bitmapGray.LockBits(rect, ImageLockMode.ReadWrite, _bitmapGray.PixelFormat);
                IntPtr ptrColor = bmpColorData.Scan0;
                IntPtr ptrGray = bmpGrayData.Scan0;

                //Declare an array in which your RGB values will be stored
                int bytesColor = Math.Abs(bmpColorData.Stride) * _bitmapColor.Height;
                int bytesGray = Math.Abs(bmpGrayData.Stride) * _bitmapGray.Height;
                byte[] rgbValues = new byte[bytesColor];
                byte[] grayValues = new byte[bytesGray];

                //Copy RGB values in that array
                Marshal.Copy(ptrColor, rgbValues, 0, bytesColor);
                byte gray = 0;
                int z = 0;
                int y = 0;
                for (int x = 0; x < _bitmapColor.Height; x += 1)
                {
                    y = 0;
                    while (y < bmpColorData.Stride)
                    {
                        if (y<_bitmapColor.Width*3)
                        {
                            gray = (byte)(rgbValues[x * bmpColorData.Stride + y] * .21 +
                                               rgbValues[x * bmpColorData.Stride + y + 1] * .71 +
                                               rgbValues[x * bmpColorData.Stride + y + 2] * .071);
                            grayValues[z] = gray;
                            y += 3;
                        } else if (y >= _bitmapColor.Width*3) 
                        {
                            while (z < bmpGrayData.Stride*(x+1))
                            {
                                grayValues[z] = rgbValues[x * bmpColorData.Stride + y];
                                z++;
                            }
                            z--;
                            y++;
                        }
                        z++;
                    }
                }

                //Copy changed Gray values back to bitmap
                Marshal.Copy(grayValues, 0, ptrGray, bytesGray);
                
                _bitmapColor.UnlockBits(bmpColorData);
                _bitmapGray.UnlockBits(bmpGrayData);
            }
        }

        private static Bitmap[] PieceImages { get; set; } = new Bitmap[12];

        #endregion

        #region Methods

        public void DetectPiecesAsync(Dictionary<string, object> args, out Dictionary<string, object> result)
        {
            // init
            result = new Dictionary<string, object>();
            
            var boardSnapshot = (Bitmap)args["formSnapshot._boardSnapshot"];
            var _chessPanel_Game_WhoseTurn = (ChessPlayer) args["_chessPanel.Game.WhoseTurn"];
            var _chessPanel_IsFlipped = (bool) args["_chessPanel.IsFlipped"];
            
            // Get settings from appsettings.json via DI
            var settings = _appSettings.CurrentValue;
            var rbutWhiteTurn_Checked = settings.RbutWhiteTurn;
            var chkbxCanBlackCastleKingSide_Checked = settings.ChkbxCanBlackCastleKingSide;
            var chkbxCanBlackCastleQueenSide_Checked = settings.ChkbxCanBlackCastleQueenSide;
            var chkbxCanWhiteCastleKingSide_Checked = settings.ChkbxCanWhiteCastleKingSide;
            var chkbxCanWhiteCastleQueenSide_Checked = settings.ChkbxCanWhiteCastleQueenSide;
            var numbxTolleranceRecogn_Value = settings.NumbxTolleranceRecogn;
            
            var backgrndDetectPieces = (BackgroundWorker) args["backgrndDetectPieces"];
            if (boardSnapshot == null)
                return;

            var cellSizeWidth = (int) boardSnapshot.Width / 8;
            var cellSizeHeight = (int) boardSnapshot.Height / 8;
            var startCurrRow = 0;
            var startCurrColumn = 0;
            CellBoard[][] cellsBoard = new CellBoard[8][]
            {
                new CellBoard[8], new CellBoard[8], new CellBoard[8], new CellBoard[8], new CellBoard[8],
                new CellBoard[8], new CellBoard[8], new CellBoard[8]
            };
            
            Dictionary<string, ChessPiece> dicRecognPieses = new Dictionary<string, ChessPiece>()
            {
                { "BishopW", new Bishop(ChessPlayer.White) },
                { "KingW", new King(ChessPlayer.White) },
                { "KnightW", new Knight(ChessPlayer.White) },
                { "PawnW", new Pawn(ChessPlayer.White) },
                { "QueenW", new Queen(ChessPlayer.White)  },
                { "RookW", new Rook(ChessPlayer.White) },
                { "BishopB", new Bishop(ChessPlayer.Black) },
                { "KingB", new King(ChessPlayer.Black) },
                { "KnightB", new Knight(ChessPlayer.Black)  },
                { "PawnB", new Pawn(ChessPlayer.Black) },
                { "QueenB", new Queen(ChessPlayer.Black) },
                { "RookB", new Rook(ChessPlayer.Black) }
            };
            
            
            model.NMSThreshold = 0.4f;
            model.ConfidenceThreshold = (float) numbxTolleranceRecogn_Value;

            GameCreationData newData = new GameCreationData();
            newData.WhoseTurn = rbutWhiteTurn_Checked ? ChessPlayer.White : ChessPlayer.Black;
            newData.CanBlackCastleKingSide = chkbxCanBlackCastleKingSide_Checked;
            newData.CanBlackCastleQueenSide = chkbxCanBlackCastleQueenSide_Checked;
            newData.CanWhiteCastleKingSide = chkbxCanWhiteCastleKingSide_Checked;
            newData.CanWhiteCastleQueenSide = chkbxCanWhiteCastleQueenSide_Checked;
            newData.EnPassant = null; // sender.chkbxEnPassant.Checked;
            
            // split in cells
            int bitmapRow = 8;
            int chessRow = 0;
            
            var stopwatch = new Stopwatch();
            stopwatch.Start();
            while (bitmapRow --> 0)
            {
                startCurrRow = cellSizeHeight * bitmapRow;
                
                for (int column = 0; column < 8; column++)
                {
                    startCurrColumn = cellSizeWidth * column;
                                 Rectangle rect =
                                     new Rectangle(startCurrColumn, startCurrRow,
                                                    cellSizeWidth, cellSizeHeight);
                    cellsBoard[chessRow][column] = new CellBoard
                    {
                        _bitmapColor = boardSnapshot.Clone(rect, PixelFormat.Format24bppRgb)
                    };
                    List<YoloPrediction> results = model.Predict(cellsBoard[chessRow][column]._bitmapColor, 512, 512);
                    if (results.Count > 0)
                        cellsBoard[chessRow][column]._recognPiece = results.First(y => Math.Abs(y.Confidence - results.Max(x => x.Confidence)) < 0.1f).Label;
                    backgrndDetectPieces.ReportProgress(column+1 + chessRow*7);
                    if (backgrndDetectPieces.CancellationPending)
                        return;
                }
                chessRow++;
            }
            stopwatch.Stop();
            TimeSpan timeTaken = stopwatch.Elapsed;
            

            ChessPiece[][] board = new ChessPiece[8][];
            bool isWhiteSide = _chessPanel_Game_WhoseTurn == ChessPlayer.White && !_chessPanel_IsFlipped;

            int r = rbutWhiteTurn_Checked ? 7 :0;
            int step_r = rbutWhiteTurn_Checked ? -1 :1;
            for (int r_dest=0; r_dest < 8; r_dest++)
            {
                ChessPiece[] currentRow = new ChessPiece[8] { null, null, null, null, null, null, null, null };
                int c = rbutWhiteTurn_Checked ? 0 : 7;
                int step_c = rbutWhiteTurn_Checked ? 1 : -1;
                for (int c_dest=0; c_dest < 8; c_dest++)
                {
                    if (cellsBoard[r][c]._recognPiece != null)
                        currentRow[c_dest] = dicRecognPieses.ContainsKey(cellsBoard[r][c]._recognPiece)
                            ? dicRecognPieses[cellsBoard[r][c]._recognPiece]
                            : null;
                    c += step_c;
                } 
                board[r_dest] = currentRow;
                r += step_r;
            }
            newData.Board = board;
            _newChessBoard = new ChessGame(newData);
            result.Add("lbLastRecognTime.Text", timeTaken.ToString(@"m\:ss\.fff"));
            result.Add("_menuItemFlipBoard.Checked", newData.WhoseTurn == ChessPlayer.Black);
            result.Add("_newChessBoard", _newChessBoard);
        }

        public static void DetectPieces(Dictionary<string, object> args,  out Dictionary<string, object> result)
        {
            // init
            result = new Dictionary<string, object>();
            
            var boardSnapshot = (Bitmap)args["formSnapshot._boardSnapshot"];
            var _chessPanel_Game_WhoseTurn = (ChessPlayer) args["_chessPanel.Game.WhoseTurn"];
            var _chessPanel_IsFlipped = (bool) args["_chessPanel.IsFlipped"];
            
            // Get settings from appsettings.json via DI
            var appSettings = args["appSettings"] as AppSettings;
            var rbutWhiteTurn_Checked = appSettings.RbutWhiteTurn;
            var chkbxCanBlackCastleKingSide_Checked = appSettings.ChkbxCanBlackCastleKingSide;
            var chkbxCanBlackCastleQueenSide_Checked = appSettings.ChkbxCanBlackCastleQueenSide;
            var chkbxCanWhiteCastleKingSide_Checked = appSettings.ChkbxCanWhiteCastleKingSide;
            var chkbxCanWhiteCastleQueenSide_Checked = appSettings.ChkbxCanWhiteCastleQueenSide;
            var numbxTolleranceRecogn_Value = appSettings.NumbxTolleranceRecogn;
            
            var backgrndDetectPieces = (BackgroundWorker) args["backgrndDetectPieces"];
            if (boardSnapshot == null)
                return;

            var cellSizeWidth = (int) boardSnapshot.Width / 8;
            var cellSizeHeight = (int) boardSnapshot.Height / 8;
            var startCurrRow = 0;
            var startCurrColumn = 0;
            CellBoard[][] cellsBoard = new CellBoard[8][]
            {
                new CellBoard[8], new CellBoard[8], new CellBoard[8], new CellBoard[8], new CellBoard[8],
                new CellBoard[8], new CellBoard[8], new CellBoard[8]
            };
            
            Dictionary<string, ChessPiece> dicRecognPieses = new Dictionary<string, ChessPiece>()
            {
                { "BishopW", new Bishop(ChessPlayer.White) },
                { "KingW", new King(ChessPlayer.White) },
                { "KnightW", new Knight(ChessPlayer.White) },
                { "PawnW", new Pawn(ChessPlayer.White) },
                { "QueenW", new Queen(ChessPlayer.White)  },
                { "RookW", new Rook(ChessPlayer.White) },
                { "BishopB", new Bishop(ChessPlayer.Black) },
                { "KingB", new King(ChessPlayer.Black) },
                { "KnightB", new Knight(ChessPlayer.Black)  },
                { "PawnB", new Pawn(ChessPlayer.Black) },
                { "QueenB", new Queen(ChessPlayer.Black) },
                { "RookB", new Rook(ChessPlayer.Black) }
            };
            
            
            model.NMSThreshold = 0.4f;
            model.ConfidenceThreshold = (float) numbxTolleranceRecogn_Value;

            GameCreationData newData = new GameCreationData();
            newData.WhoseTurn = rbutWhiteTurn_Checked ? ChessPlayer.White : ChessPlayer.Black;
            newData.CanBlackCastleKingSide = chkbxCanBlackCastleKingSide_Checked;
            newData.CanBlackCastleQueenSide = chkbxCanBlackCastleQueenSide_Checked;
            newData.CanWhiteCastleKingSide = chkbxCanWhiteCastleKingSide_Checked;
            newData.CanWhiteCastleQueenSide = chkbxCanWhiteCastleQueenSide_Checked;
            newData.EnPassant = null; // sender.chkbxEnPassant.Checked;
            
            // split in cells
            int bitmapRow = 8;
            int chessRow = 0;
            
            var stopwatch = new Stopwatch();
            stopwatch.Start();
            while (bitmapRow --> 0)
            {
                startCurrRow = cellSizeHeight * bitmapRow;
                
                for (int column = 0; column < 8; column++)
                {
                    startCurrColumn = cellSizeWidth * column;
                                 Rectangle rect =
                                     new Rectangle(startCurrColumn, startCurrRow,
                                                    cellSizeWidth, cellSizeHeight);
                    cellsBoard[chessRow][column] = new CellBoard
                    {
                        _bitmapColor = boardSnapshot.Clone(rect, PixelFormat.Format24bppRgb)
                    };
                    List<YoloPrediction> results = model.Predict(cellsBoard[chessRow][column]._bitmapColor, 512, 512);
                    if (results.Count > 0)
                        cellsBoard[chessRow][column]._recognPiece = results.First(y => Math.Abs(y.Confidence - results.Max(x => x.Confidence)) < 0.1f).Label;
                    backgrndDetectPieces.ReportProgress(column+1 + chessRow*7);
                    if (backgrndDetectPieces.CancellationPending)
                        return;
                }
                chessRow++;
            }
            stopwatch.Stop();
            TimeSpan timeTaken = stopwatch.Elapsed;
            

            ChessPiece[][] board = new ChessPiece[8][];
            bool isWhiteSide = _chessPanel_Game_WhoseTurn == ChessPlayer.White && !_chessPanel_IsFlipped;

            int r = rbutWhiteTurn_Checked ? 7 :0;
            int step_r = rbutWhiteTurn_Checked ? -1 :1;
            for (int r_dest=0; r_dest < 8; r_dest++)
            {
                ChessPiece[] currentRow = new ChessPiece[8] { null, null, null, null, null, null, null, null };
                int c = rbutWhiteTurn_Checked ? 0 : 7;
                int step_c = rbutWhiteTurn_Checked ? 1 : -1;
                for (int c_dest=0; c_dest < 8; c_dest++)
                {
                    if (cellsBoard[r][c]._recognPiece != null)
                        currentRow[c_dest] = dicRecognPieses.ContainsKey(cellsBoard[r][c]._recognPiece)
                            ? dicRecognPieses[cellsBoard[r][c]._recognPiece]
                            : null;
                    c += step_c;
                } 
                board[r_dest] = currentRow;
                r += step_r;
            }
            newData.Board = board;
            _newChessBoard = new ChessGame(newData);
            result.Add("lbLastRecognTime.Text", timeTaken.ToString(@"m\:ss\.fff"));
            result.Add("_menuItemFlipBoard.Checked", newData.WhoseTurn == ChessPlayer.Black);
            result.Add("_newChessBoard", _newChessBoard);
        }

        public static Bitmap GetBoardSnap()
        {
            if (!BoardFound)
                return null;

            Screen screen = Screen.AllScreens[ScreenIndex];
            Bitmap scrennshot = new Bitmap(BoardSize.Width, BoardSize.Height, PixelFormat.Format24bppRgb);

            using (Graphics g = Graphics.FromImage(scrennshot))
            {
                g.CopyFromScreen(screen.Bounds.X + BoardLocation.X, screen.Bounds.Y + BoardLocation.Y, 0, 0, BoardSize, CopyPixelOperation.SourceCopy);
            }

            return scrennshot;
        }
        
        #endregion
    }
    
    
}
