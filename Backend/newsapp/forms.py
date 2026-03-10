from django import forms
from .models import Role, Permission

class CustomUserCreationForm(forms.Form):
    first_name = forms.CharField(
        max_length=100, 
        label="Full Name",
        widget=forms.TextInput(attrs={'placeholder': 'Enter full name'})
    )
    email = forms.EmailField(
        label="Email Address",
        widget=forms.EmailInput(attrs={'placeholder': 'Enter email address'})
    )
    roles = forms.ModelMultipleChoiceField(
        queryset=Role.objects.all(),
        widget=forms.CheckboxSelectMultiple,
        label="Roles"
    )
    extra_permissions = forms.ModelMultipleChoiceField(
        queryset=Permission.objects.all(),
        widget=forms.CheckboxSelectMultiple,
        label="Extra Permissions",
        required=False,
        help_text="Ye permissions role ki permissions ke upar extra milegi"
    )