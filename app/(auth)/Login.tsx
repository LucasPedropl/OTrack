
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/authContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Box } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('admin@otrack.com');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email);
    
    setLoading(false);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.message || 'Falha ao entrar.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900 text-white shadow-md">
            <Box size={20} />
          </div>
          <h2 className="mt-6 text-2xl font-bold tracking-tight text-gray-900">Bem-vindo ao OTrack</h2>
          <p className="mt-2 text-sm text-gray-500">
            Entre com seu email para continuar
          </p>
        </div>
        
        <div className="bg-white px-6 py-8 shadow-sm border border-gray-200 rounded-lg">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <Input
                label="Email"
                type="email"
                required
                placeholder="nome@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={error}
              />
            </div>

            <div>
              <Button
                type="submit"
                className="w-full"
                size="md"
                isLoading={loading}
              >
                Entrar
              </Button>
            </div>
            
            <div className="text-xs text-center text-gray-400 mt-4 border-t border-gray-100 pt-4">
              <p>Admin Padrão: <span className="font-mono text-gray-600">admin@otrack.com</span></p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
