import { TieDyeLogoIcon } from '@/components/icons/tie-dye-logo';
import { Progress } from '@/components/ui/progress';

interface LoaderProps {
  message?: string;
  progress?: number; // Optional progress value (0-100)
}

const Loader = ({ message = "Generating your tale...", progress }: LoaderProps) => {
  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8 text-center w-full max-w-md mx-auto">
      <TieDyeLogoIcon className="h-16 w-16 text-primary animate-swirl" />
      <p className="text-lg font-medium text-foreground">{message}</p>
      {progress !== undefined && progress >= 0 && progress <= 100 && (
        <div className="w-full mt-2">
          <Progress value={progress} className="w-full h-3 bg-secondary" />
          <p className="text-sm text-muted-foreground mt-2">{Math.round(progress)}% complete</p>
        </div>
      )}
      { (progress === undefined) && <p className="text-sm text-muted-foreground">This might take a moment, especially for longer stories!</p> }
    </div>
  );
};

export default Loader;
