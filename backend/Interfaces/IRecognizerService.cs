namespace backend.Interfaces
{
    public interface IRecognizerService
    {
        void DetectPiecesAsync(Dictionary<string, object> args, out Dictionary<string, object> result);
    }
}
