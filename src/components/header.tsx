import Link from 'next/link';
import { TieDyeLogoIcon } from '@/components/icons/tie-dye-logo';

const AppHeader = () => {
  return (
    <header className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <TieDyeLogoIcon className="h-10 w-10 text-accent" />
          <h1 className="text-2xl font-bold tracking-tight">Tie-Dyed Tales</h1>
        </Link>
        {/* Navigation links can be added here if needed */}
      </div>
    </header>
  );
};

export default AppHeader;