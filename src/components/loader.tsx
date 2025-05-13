import { TieDyeLogoIcon } from '@/components/icons/tie-dye-logo';

interface LoaderProps {
  message?: string;
}

const Loader = ({ message = "Generating your tale..." }: LoaderProps) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
      <TieDyeLogoIcon className="h-16 w-16 text-primary animate-swirl" />
      <p className="text-lg font-medium text-foreground">{message}</p>
      <p className="text-sm text-muted-foreground">This might take a moment, especially for longer stories!</p>
    </div>
  );
};

export default Loader;