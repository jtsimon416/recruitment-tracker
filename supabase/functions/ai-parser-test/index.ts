class CommissionCalculator:
    """
    Calculates the commission for different types of recruitment placements.
    """

    def calculate_commission(self, placement_type: str, **kwargs) -> float:
        """
        Calculates commission based on the placement type and provided details.

        For 'Permanent' placements, kwargs should include:
        - annual_salary: The annual salary of the placed candidate.
        - commission_rate: The commission percentage (e.g., 0.20 for 20%).

        For 'Contract' placements, kwargs should include:
        - client_rate: The hourly rate billed to the client.
        - contractor_rate: The hourly rate paid to the contractor.
        - hours_worked: The total hours worked by the contractor.

        Returns:
            The calculated commission as a float.

        Raises:
            ValueError: If the placement type is unknown or missing required arguments.
        """
        if placement_type == 'Permanent':
            try:
                annual_salary = kwargs['annual_salary']
                commission_rate = kwargs['commission_rate']
                commission = annual_salary * commission_rate
                return commission
            except KeyError as e:
                raise ValueError(f"Missing required argument for 'Permanent' placement: {e}")

        elif placement_type == 'Contract':
            try:
                client_rate = kwargs['client_rate']
                contractor_rate = kwargs['contractor_rate']
                hours_worked = kwargs['hours_worked']
                
                # Corrected commission calculation for Contract placements
                spread = client_rate - contractor_rate
                commission = spread * hours_worked
                return commission
            except KeyError as e:
                raise ValueError(f"Missing required argument for 'Contract' placement: {e}")

        else:
            raise ValueError(f"Unknown placement type: '{placement_type}'")

# Example Usage:
# calculator = CommissionCalculator()

# # Permanent placement example
# perm_commission = calculator.calculate_commission(
#     'Permanent',
#     annual_salary=100000,
#     commission_rate=0.20
# )
# print(f"Commission for Permanent placement: ${perm_commission:.2f}") # Expected: .00

# # Contract placement example
# contract_commission = calculator.calculate_commission(
#     'Contract',
#     client_rate=100,
#     contractor_rate=75,
#     hours_worked=480
# )
# print(f"Commission for Contract placement: .2f") # Expected: .00
