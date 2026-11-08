import { useNavigate } from "react-router";
import { CrearPedidoModal } from "./CrearPedidoModal";

/**
 * Página puente `/pedidos/crear`.
 * Permite que cualquier enlace directo o bookmark siga funcionando,
 * renderizando el modal de creación de pedido y volviendo a `/pedidos` al cerrar.
 */
export const CrearPedidoPage = () => {
  const navigate = useNavigate();

  return (
    <CrearPedidoModal
      isOpen={true}
      onClose={() => navigate("/pedidos")}
      onPedidoCreado={(id) => navigate(`/pedidos?focus=${id}`)}
    />
  );
};

export default CrearPedidoPage;
