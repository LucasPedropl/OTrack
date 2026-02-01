
import React from 'react';
import { useTheme, themes } from '../services/themeContext';
import { Check, Palette } from 'lucide-react';
import Card from '../components/ui/Card';

const Settings: React.FC = () => {
  const { currentTheme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-500">Personalize a aparência do sistema.</p>
      </div>

      <Card title="Aparência" description="Escolha o tema de cores da aplicação.">
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-4 text-sm font-medium text-gray-700">
             <Palette size={18} />
             <span>Tema Selecionado: <span className="text-primary">{currentTheme.name}</span></span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setTheme(theme.id)}
                className={`relative flex items-center p-3 rounded-lg border-2 transition-all hover:shadow-md text-left ${
                  currentTheme.id === theme.id 
                    ? 'border-primary ring-1 ring-primary bg-primary/5' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div 
                  className="h-10 w-10 rounded-full shadow-sm flex-shrink-0 mr-3"
                  style={{ backgroundColor: theme.primary }}
                ></div>
                
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-900">{theme.name}</p>
                  <p className="text-xs text-gray-500">Cor Principal</p>
                </div>

                {currentTheme.id === theme.id && (
                  <div className="absolute top-2 right-2 p-1 bg-white rounded-full text-primary shadow-sm">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-100">
           <h4 className="text-sm font-medium text-gray-700 mb-2">Pré-visualização</h4>
           <div className="flex gap-2">
              <div className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium shadow-sm">
                 Botão Primário
              </div>
              <div className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium">
                 Botão Secundário
              </div>
              <div className="px-4 py-2 text-primary bg-primary/10 rounded-md text-sm font-medium">
                 Texto Destaque
              </div>
           </div>
        </div>
      </Card>
    </div>
  );
};

export default Settings;
